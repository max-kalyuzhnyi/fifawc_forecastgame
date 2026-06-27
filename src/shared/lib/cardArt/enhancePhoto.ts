import { toFile } from "openai";
import sharp from "sharp";
import { detectFace, expandHeadBox, getFallbackFaceDetection } from "@/shared/lib/cardArt/detectFace";
import { PHOTO_ENHANCEMENT_PROMPT } from "@/shared/lib/cardArt/prompts";
import type { FaceDetectionResult, NormalizedBox } from "@/shared/lib/cardArt/types";
import { getOpenAIClient } from "@/shared/lib/openai/client";

const DEFAULT_IMAGE_MODEL = "gpt-image-1.5";
const DEFAULT_LONG_EDGE = 1024;

type OpenAiImageSize =
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "auto";

function pickPortraitSize(width: number, height: number): OpenAiImageSize {
  if (width <= 0 || height <= 0) return "1024x1536";
  return height >= width ? "1024x1536" : "1536x1024";
}

export async function upscalePhoto(
  bytes: Buffer,
  minLongEdge = DEFAULT_LONG_EDGE,
): Promise<Buffer> {
  const image = sharp(bytes, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const longEdge = Math.max(width, height);

  let pipeline = image;
  if (longEdge > 0 && longEdge < minLongEdge) {
    const scale = minLongEdge / longEdge;
    pipeline = pipeline.resize(Math.round(width * scale), Math.round(height * scale), {
      fit: "fill",
      kernel: "lanczos3",
    });
  }

  return pipeline
    .median(1)
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 0.25 })
    .png()
    .toBuffer();
}

export async function buildFaceProtectMask(
  width: number,
  height: number,
  face: NormalizedBox,
  featherPx = 10,
): Promise<Buffer> {
  const left = Math.max(0, Math.floor(face.x * width));
  const top = Math.max(0, Math.floor(face.y * height));
  const rectWidth = Math.min(width - left, Math.ceil(face.w * width));
  const rectHeight = Math.min(height - top, Math.ceil(face.h * height));
  const radius = Math.min(rectWidth, rectHeight) * 0.12;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${left}" y="${top}" width="${rectWidth}" height="${rectHeight}" rx="${radius}" fill="white"/>
  </svg>`;

  let mask = await sharp(Buffer.from(svg)).ensureAlpha().png().toBuffer();
  if (featherPx > 0) {
    mask = await sharp(mask).blur(featherPx).png().toBuffer();
  }
  return mask;
}

async function buildFeatherAlphaMask(
  width: number,
  height: number,
  featherPx = 16,
): Promise<Buffer> {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.46;
  const ry = height * 0.46;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white"/>
  </svg>`;

  return sharp(Buffer.from(svg))
    .blur(featherPx)
    .ensureAlpha()
    .png()
    .toBuffer();
}

export function getHeadCropRect(
  width: number,
  height: number,
  face: NormalizedBox,
): { left: number; top: number; width: number; height: number } {
  const expanded = expandHeadBox(face);
  const left = Math.max(0, Math.floor(expanded.x * width));
  const top = Math.max(0, Math.floor(expanded.y * height));
  const cropWidth = Math.min(width - left, Math.ceil(expanded.w * width));
  const cropHeight = Math.min(height - top, Math.ceil(expanded.h * height));

  return {
    left,
    top,
    width: Math.max(1, cropWidth),
    height: Math.max(1, cropHeight),
  };
}

export async function repasteOriginalHead(
  originalUpscaled: Buffer,
  aiEnhanced: Buffer,
  face: NormalizedBox,
): Promise<Buffer> {
  const meta = await sharp(originalUpscaled).metadata();
  const imageWidth = meta.width ?? 0;
  const imageHeight = meta.height ?? 0;

  if (imageWidth === 0 || imageHeight === 0) {
    return originalUpscaled;
  }

  const crop = getHeadCropRect(
    imageWidth,
    imageHeight,
    expandHeadBox(face, { x: 0.18, y: 0.14, w: 0.36, h: 0.4 }),
  );
  const headCrop = await sharp(originalUpscaled)
    .extract(crop)
    .png()
    .toBuffer();

  const featherMask = await buildFeatherAlphaMask(crop.width, crop.height, 32);
  const headWithAlpha = await sharp(headCrop)
    .ensureAlpha()
    .composite([{ input: featherMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const aiResized = await sharp(aiEnhanced)
    .resize(imageWidth, imageHeight, { fit: "fill" })
    .png()
    .toBuffer();

  return sharp(aiResized)
    .composite([
      {
        input: headWithAlpha,
        left: crop.left,
        top: crop.top,
      },
    ])
    .png()
    .toBuffer();
}

async function callOpenAiImageEdit(
  sourcePng: Buffer,
  maskPng: Buffer,
  imageModel: string,
): Promise<Buffer> {
  const client = getOpenAIClient();
  const meta = await sharp(sourcePng).metadata();
  const size = pickPortraitSize(meta.width ?? 0, meta.height ?? 0);

  const resizedSource = await sharp(sourcePng)
    .resize(
      size === "1024x1536" ? 1024 : 1536,
      size === "1024x1536" ? 1536 : 1024,
      { fit: "cover" },
    )
    .png()
    .toBuffer();

  const resizedMask = await sharp(maskPng)
    .resize(
      size === "1024x1536" ? 1024 : 1536,
      size === "1024x1536" ? 1536 : 1024,
      { fit: "cover" },
    )
    .png()
    .toBuffer();

  const imageFile = await toFile(resizedSource, "source.png", { type: "image/png" });
  const maskFile = await toFile(resizedMask, "mask.png", { type: "image/png" });

  const response = await client.images.edit({
    model: imageModel,
    image: imageFile,
    mask: maskFile,
    prompt: PHOTO_ENHANCEMENT_PROMPT,
    size,
    n: 1,
    ...(imageModel.startsWith("gpt-image-1") && !imageModel.includes("mini")
      ? { input_fidelity: "high" as const }
      : {}),
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image edit returned no image data");
  }

  return Buffer.from(b64, "base64");
}

export interface EnhancePhotoOptions {
  skipAiEnhancement?: boolean;
  minLongEdge?: number;
  imageModel?: string;
  visionModel?: string;
  faceDetection?: FaceDetectionResult;
}

export interface EnhancePhotoResult {
  enhancedPng: Buffer;
  faceDetection: FaceDetectionResult;
  usedAiEnhancement: boolean;
  faceReused: boolean;
}

export async function enhancePhoto(
  photoBytes: Buffer,
  options: EnhancePhotoOptions = {},
): Promise<EnhancePhotoResult> {
  const upscaled = await upscalePhoto(photoBytes, options.minLongEdge);

  if (options.skipAiEnhancement) {
    return {
      enhancedPng: upscaled,
      faceDetection: options.faceDetection ?? getFallbackFaceDetection(),
      usedAiEnhancement: false,
      faceReused: true,
    };
  }

  const faceDetection =
    options.faceDetection ?? (await detectFace(upscaled, { visionModel: options.visionModel }));

  const meta = await sharp(upscaled).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (width === 0 || height === 0) {
    return {
      enhancedPng: upscaled,
      faceDetection,
      usedAiEnhancement: false,
      faceReused: true,
    };
  }

  const protectBox = expandHeadBox(faceDetection.head, {
    x: 0.08,
    y: 0.06,
    w: 0.16,
    h: 0.2,
  });
  const mask = await buildFaceProtectMask(width, height, protectBox);

  const imageModel =
    options.imageModel ?? process.env.CARD_ART_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL;

  try {
    const aiEnhanced = await callOpenAiImageEdit(upscaled, mask, imageModel);
    const withOriginalFace = await repasteOriginalHead(upscaled, aiEnhanced, faceDetection.head);

    return {
      enhancedPng: withOriginalFace,
      faceDetection,
      usedAiEnhancement: true,
      faceReused: true,
    };
  } catch {
    return {
      enhancedPng: upscaled,
      faceDetection,
      usedAiEnhancement: false,
      faceReused: true,
    };
  }
}
