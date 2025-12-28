import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "아이 영어일기 AI 첨삭 - 따뜻한 영어 학습",
  description: "AI가 아이의 영어 일기를 따뜻하고 정확하게 첨삭해줍니다. 손글씨 사진으로도 가능해요!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
