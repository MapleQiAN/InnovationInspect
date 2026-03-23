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
      <body>
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 text-sm">
          <a href="/" className="font-bold text-gray-900 mr-2">
            查重评估系统
          </a>
          <a href="/" className="text-gray-600 hover:text-blue-600 font-medium">
            首页
          </a>
          <a href="/skills" className="text-gray-600 hover:text-blue-600 font-medium">
            OpenClaw Skills
          </a>
        </nav>
        {children}
      </body>
    </html>
  );
}
