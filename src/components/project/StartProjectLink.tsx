import Link from "next/link";
import type { ComponentProps } from "react";

type StartProjectLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href?: string;
};

/** 랜딩·마케팅 CTA → 컷 1 진입점 선택(`/project/new`) */
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
