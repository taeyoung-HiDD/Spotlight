import { stripCoachMarkdownMarkers } from "@/lib/coach/formatCoachDialog";
import { isValidElement, type ReactNode } from "react";

/**
 * 인트로 등에서 조각 JSX(span 렌더)로 넘긴 내용도 타이핑 애니메이션 가능하도록
 * 보이는 텍스트만 순서대로 합친다.
 */
export function flattenCoachRevealSource(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") {
    return stripCoachMarkdownMarkers(String(node));
  }
  if (Array.isArray(node)) {
    return node.map((n) => flattenCoachRevealSource(n)).join("");
  }
  if (isValidElement(node)) {
    const children = (
      node.props as { children?: ReactNode | undefined }
    ).children;
    return flattenCoachRevealSource(children ?? "");
  }
  return "";
}
