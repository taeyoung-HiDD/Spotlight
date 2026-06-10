import type { Metadata } from "next";
import { themeBootstrapScript } from "@/lib/theme/applyTheme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spotlight",
  description: "자율 선택형 AI 디자인씽킹 코치",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans break-keep text-foreground">
        {children}
      </body>
    </html>
  );
}
