export const PHOTO_ENHANCEMENT_PROMPT = [
  "Restore and enhance this football player photograph.",
  "Increase sharpness and clarity, remove JPEG/compression artifacts and noise,",
  "correct lighting, exposure and white balance, and make the jersey fabric,",
  "crest and background clean and crisp.",
  "Keep the exact same pose, framing, composition and proportions.",
  "Do NOT alter the person's identity, facial features, skin tone, hairstyle, age or body shape.",
  "The protected (masked) region must remain pixel-identical.",
  "Photorealistic, high detail.",
].join(" ");

export const FACE_DETECTION_SYSTEM_PROMPT = [
  "You detect the head bounding box in football player portrait photos.",
  "Return JSON only.",
  "The head box must include the full face, hair, ears, and chin.",
  "Coordinates are normalized 0–1 relative to image width (x, w) and height (y, h).",
].join(" ");

export const FACE_DETECTION_USER_PROMPT = [
  "Locate the player's head in this image.",
  "Return { head: { x, y, w, h }, confidence } where confidence is 0–1.",
].join(" ");
