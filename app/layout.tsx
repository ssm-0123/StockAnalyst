import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "투자 분석 대시보드",
  description: "일일 섹터 분석과 투자 의사결정을 위한 대시보드입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
