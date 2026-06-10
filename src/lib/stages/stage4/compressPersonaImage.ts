const MAX_OUTPUT_BYTES = 120_000;
const OUTPUT_SIZE = 160;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = src;
  });
}

function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  mime: "image/jpeg" | "image/webp",
  quality: number,
): string {
  return canvas.toDataURL(mime, quality);
}

async function dataUrlUnderLimit(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 준비하지 못했습니다.");

  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const attempts: Array<{ mime: "image/jpeg" | "image/webp"; quality: number }> =
    [
      { mime: "image/webp", quality: 0.82 },
      { mime: "image/webp", quality: 0.68 },
      { mime: "image/jpeg", quality: 0.82 },
      { mime: "image/jpeg", quality: 0.65 },
      { mime: "image/jpeg", quality: 0.5 },
    ];

  for (const { mime, quality } of attempts) {
    const out = canvasToDataUrl(canvas, mime, quality);
    if (out.length <= MAX_OUTPUT_BYTES) return out;
  }

  return canvasToDataUrl(canvas, "image/jpeg", 0.42);
}

export async function fileToPersonaThumbnailDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("사진 또는 이미지 파일만 올릴 수 있어요.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("8MB 이하 이미지만 올릴 수 있어요.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await dataUrlUnderLimit(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function normalizePersonaThumbnailDataUrl(
  dataUrl: string,
): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  return dataUrlUnderLimit(dataUrl);
}
