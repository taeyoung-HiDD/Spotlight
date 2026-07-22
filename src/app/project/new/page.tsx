import { NewProjectRedirect } from "@/components/project/NewProjectRedirect";

export default function NewProjectPage() {
  return (
    <div className="min-h-full bg-cream px-4 py-8 sm:px-6 sm:py-9">
      <h1 className="sr-only">새 프로젝트</h1>
      <div className="mx-auto max-w-[668px]">
        <NewProjectRedirect />
      </div>
    </div>
  );
}
