import { z } from "zod";
import { getOpenAIClient } from "@/shared/lib/openai/client";
import {
  FACE_DETECTION_SYSTEM_PROMPT,
  FACE_DETECTION_USER_PROMPT,
} from "@/shared/lib/cardArt/prompts";
import {
  DEFAULT_FALLBACK_HEAD,
  type FaceDetectionResult,
  type NormalizedBox,
} from "@/shared/lib/cardArt/types";

const faceDetectionSchema = z.object({
  head: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0.05).max(1),
    h: z.number().min(0.05).max(1),
  }),
  confidence: z.number().min(0).max(1),
});

const DEFAULT_VISION_MODEL = "gpt-4o-mini";
const MIN_CONFIDENCE = 0.35;

function clampBox(box: NormalizedBox): NormalizedBox {
  const x = Math.max(0, Math.min(1, box.x));
  const y = Math.max(0, Math.min(1, box.y));
  const w = Math.max(0.05, Math.min(1 - x, box.w));
  const h = Math.max(0.05, Math.min(1 - y, box.h));
  return { x, y, w, h };
}

function toDataUrl(imageBytes: Buffer, mimeType = "image/png"): string {
  return `data:${mimeType};base64,${imageBytes.toString("base64")}`;
}

function parseDetectionJson(raw: string): FaceDetectionResult | null {
  try {
    const parsed = faceDetectionSchema.parse(JSON.parse(raw));
    return {
      head: clampBox(parsed.head),
      confidence: parsed.confidence,
    };
  } catch {
    return null;
  }
}

export function getFallbackFaceDetection(): FaceDetectionResult {
  return {
    head: { ...DEFAULT_FALLBACK_HEAD },
    confidence: 0,
  };
}

export async function detectFace(
  imageBytes: Buffer,
  options?: { visionModel?: string },
): Promise<FaceDetectionResult> {
  const client = getOpenAIClient();
  const visionModel = options?.visionModel ?? process.env.CARD_ART_VISION_MODEL ?? DEFAULT_VISION_MODEL;

  try {
    const response = await client.chat.completions.create({
      model: visionModel,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "face_detection",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["head", "confidence"],
            properties: {
              head: {
                type: "object",
                additionalProperties: false,
                required: ["x", "y", "w", "h"],
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                  w: { type: "number" },
                  h: { type: "number" },
                },
              },
              confidence: { type: "number" },
            },
          },
        },
      },
      messages: [
        { role: "system", content: FACE_DETECTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: FACE_DETECTION_USER_PROMPT },
            {
              type: "image_url",
              image_url: { url: toDataUrl(imageBytes) },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return getFallbackFaceDetection();
    }

    const detection = parseDetectionJson(content);
    if (!detection || detection.confidence < MIN_CONFIDENCE) {
      return getFallbackFaceDetection();
    }

    return detection;
  } catch {
    return getFallbackFaceDetection();
  }
}

export function expandHeadBox(
  box: NormalizedBox,
  padding: { x?: number; y?: number; w?: number; h?: number } = {},
): NormalizedBox {
  const padX = padding.x ?? 0.12;
  const padY = padding.y ?? 0.1;
  const padW = padding.w ?? 0.24;
  const padH = padding.h ?? 0.28;

  return clampBox({
    x: box.x - box.w * padX,
    y: box.y - box.h * padY,
    w: box.w * (1 + padW),
    h: box.h * (1 + padH),
  });
}
