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
        <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-white/60 border-b border-slate-200/50 px-6 py-3 flex items-center gap-6 text-sm">
          <a href="/" className="flex items-center gap-2.5 mr-4 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-300/30">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
            </div>
            <span className="font-bold text-slate-800 tracking-tight text-base">查重评估系统</span>
          </a>
          <div className="flex items-center gap-0.5 bg-slate-100/60 rounded-lg p-0.5">
            <a href="/" className="px-3.5 py-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm font-medium transition-all duration-200">
              任务中心
            </a>
            <a href="/history" className="px-3.5 py-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm font-medium transition-all duration-200">
              已处理项目
            </a>
            <a href="/skills" className="px-3.5 py-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm font-medium transition-all duration-200">
              OpenClaw Skills
            </a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">系统运行中</span>
          </div>
        </nav>
        <div className="animate-fade-in">
          {children}
        </div>
      </body>
    </html>
  );
}
