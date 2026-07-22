import Link from "next/link";
import type { ComponentProps } from "react";

type StartProjectLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href?: string;
};

/** 랜딩·마케팅 CTA → 프로젝트 생성 후 단계 1(코칭 방식 선택) */
export function StartProjectLink({
  href = "/project/new",
  children,
  ...rest
}: StartProjectLinkProps) {
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
