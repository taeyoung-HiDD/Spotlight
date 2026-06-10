import Link from "next/link";
import { EntryPointSelection } from "@/components/project/EntryPointSelection";

export default function NewProjectPage() {
  return (
    <div className="min-h-full bg-cream px-4 py-8 sm:px-6 sm:py-9">
      <h1 className="sr-only">진입점 선택 · 컷 1</h1>
      <div className="mx-auto max-w-[668px]">
        <p className="mb-4 text-center">
          <Link
            href="/"
            className="text-[11px] font-medium text-muted transition-colors hover:text-foreground"
          >
            ← 랜딩으로
          </Link>
        </p>
        <div
          data-cut="1"
          data-mood="work"
          className="rounded-2xl bg-background px-6 py-9 sm:px-6"
        >
          <EntryPointSelection />
        </div>
      </div>
    </div>
  );
}
