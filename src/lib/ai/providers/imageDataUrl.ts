export function buildImageDataUrl(
  mimeType: string,
  base64: string,
): string | null {
  const clean = base64.trim();
  if (!clean) return null;
  return `data:${mimeType || "image/png"};base64,${clean}`;
}

export function bufferToImageDataUrl(
  buffer: ArrayBuffer,
  mimeType: string,
): string | null {
  const base64 = Buffer.from(buffer).toString("base64");
  return buildImageDataUrl(mimeType, base64);
}
