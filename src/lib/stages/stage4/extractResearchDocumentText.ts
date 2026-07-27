/**
 * 리서치 문서(텍스트·DOCX 등)에서 분석용 본문 추출.
 * PDF는 Gemini에 바이너리로 넘기는 편이 안정적이라 여기서는 빈 텍스트를 반환한다.
 */

import mammoth from "mammoth";

const MAX_CHARS = 24_000;

function isDocx(mimeType: string, fileName: string): boolean {
  const mime = mimeType.toLowerCase();
  const name = fileName.toLowerCase();
  return (
    mime.includes(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ) ||
    mime === "application/msword" ||
    /\.docx$/i.test(name)
  );
}

function isPdf(mimeType: string, fileName: string): boolean {
  return (
    mimeType.toLowerCase() === "application/pdf" || /\.pdf$/i.test(fileName)
  );
}

function isPlainText(mimeType: string, fileName: string): boolean {
  const mime = mimeType.toLowerCase();
  const name = fileName.toLowerCase();
  if (mime.startsWith("text/")) return true;
  return /\.(txt|md|markdown|csv|json|log|rtf)$/i.test(name);
}

export type ExtractedResearchDocument =
  | { mode: "text"; text: string }
  | { mode: "pdf"; buffer: Buffer };

export async function extractResearchDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ExtractedResearchDocument> {
  if (isPdf(mimeType, fileName)) {
    return { mode: "pdf", buffer };
  }

  if (isDocx(mimeType, fileName)) {
    // 구형 .doc 은 mammoth가 안정적으로 처리하지 못함
    if (/\.doc$/i.test(fileName) && !/\.docx$/i.test(fileName)) {
      throw new Error(
        "구형 .doc 파일은 아직 지원하지 않아요. .docx 또는 .txt로 저장해 다시 올려 주세요.",
      );
    }
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.replace(/\r\n/g, "\n").trim();
    if (!text) {
      throw new Error("문서에서 읽을 수 있는 텍스트를 찾지 못했어요.");
    }
    return { mode: "text", text: text.slice(0, MAX_CHARS) };
  }

  if (isPlainText(mimeType, fileName) || !mimeType) {
    const text = buffer.toString("utf8").replace(/\r\n/g, "\n").trim();
    if (!text) {
      throw new Error("문서에서 읽을 수 있는 텍스트를 찾지 못했어요.");
    }
    return { mode: "text", text: text.slice(0, MAX_CHARS) };
  }

  throw new Error(
    "지원하지 않는 문서 형식이에요. txt·md·docx·pdf 파일을 올려 주세요.",
  );
}

export function decodeInlineDataUrl(dataUrl: string): {
  mimeType: string;
  buffer: Buffer;
} {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/i);
  if (!match) {
    throw new Error("문서 데이터 형식이 올바르지 않아요.");
  }
  const mimeType = (match[1] || "text/plain").trim();
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";
  if (isBase64) {
    return { mimeType, buffer: Buffer.from(payload, "base64") };
  }
  try {
    return {
      mimeType,
      buffer: Buffer.from(decodeURIComponent(payload), "utf8"),
    };
  } catch {
    return { mimeType, buffer: Buffer.from(payload, "utf8") };
  }
}
