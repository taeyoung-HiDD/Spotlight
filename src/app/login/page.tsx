import { Suspense } from "react";
import { LoginSignupForm } from "@/components/auth/LoginSignupForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-cream px-4 py-10 sm:py-14">
      <h1 className="sr-only">로그인 · 회원가입</h1>
      <Suspense fallback={null}>
        <LoginSignupForm />
      </Suspense>
    </div>
  );
}
