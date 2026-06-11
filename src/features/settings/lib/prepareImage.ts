const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const HEIC_EXTENSIONS = new Set([".heic", ".heif"]);

const MAX_EDGE_PX = 1280;

function isHeicFile(file: File): boolean {
  if (HEIC_TYPES.has(file.type.toLowerCase())) return true;

  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  return extension ? HEIC_EXTENSIONS.has(extension) : false;
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });

  const blob = Array.isArray(converted) ? converted[0] : converted;
  if (!(blob instanceof Blob)) {
    throw new Error("Failed to convert HEIC image");
  }

  return blob;
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    image.src = url;
  });
}

async function downscaleImage(blob: Blob): Promise<Blob> {
  const image = await loadImageFromBlob(blob);
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);

  if (longestEdge <= MAX_EDGE_PX) {
    return blob;
  }

  const scale = MAX_EDGE_PX / longestEdge;
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to prepare image canvas");
  }

  context.drawImage(image, 0, 0, width, height);

  const outputType = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
  const prepared = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, 0.9);
  });

  if (!prepared) {
    throw new Error("Failed to compress image");
  }

  return prepared;
}

export async function prepareImageForUpload(file: File): Promise<Blob> {
  const source = isHeicFile(file) ? await convertHeicToJpeg(file) : file;
  return downscaleImage(source);
}
