export interface NormalizedBox {
  /** Left edge, 0–1 relative to image width */
  x: number;
  /** Top edge, 0–1 relative to image height */
  y: number;
  /** Width, 0–1 relative to image width */
  w: number;
  /** Height, 0–1 relative to image height */
  h: number;
}

export interface FaceDetectionResult {
  head: NormalizedBox;
  confidence: number;
}

export interface PlayerCardMeta {
  playerId: string;
  displayName: string;
  teamName: string;
  shirtNumber: number | null;
  position: "GK" | "DF" | "MF" | "FW" | null;
  primaryColor?: string | null;
  flagCode?: string | null;
}

export interface GeneratePlayerCardOptions {
  /** Skip OpenAI enhancement (compose-only, for local testing). */
  skipAiEnhancement?: boolean;
  /** Card output width in pixels. */
  outputWidth?: number;
  /** Card output height in pixels. */
  outputHeight?: number;
  /** Minimum long edge for the enhancement pipeline. */
  enhanceLongEdge?: number;
  /** OpenAI image model override. */
  imageModel?: string;
  /** Vision model for face detection. */
  visionModel?: string;
}

export interface GeneratePlayerCardResult {
  cardWebp: Buffer;
  enhancedPhotoWebp: Buffer;
  faceReused: boolean;
  usedAiEnhancement: boolean;
}

export const CARD_DIMENSIONS = {
  width: 512,
  height: 768,
} as const;

export const PHOTO_WINDOW = {
  x: 0,
  y: 56,
  width: CARD_DIMENSIONS.width,
  height: CARD_DIMENSIONS.height - 168,
} as const;

export const DEFAULT_FALLBACK_HEAD: NormalizedBox = {
  x: 0.22,
  y: 0.04,
  w: 0.56,
  h: 0.42,
};
