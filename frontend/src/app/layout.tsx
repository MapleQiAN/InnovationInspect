import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "竞赛材料查重与创新评估系统",
  description: "基于方案实质比对的智能评审系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
