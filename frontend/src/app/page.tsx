import { TaskCenter } from "@/components/tasks/TaskCenter";

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-57px)] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 mesh-gradient pointer-events-none" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200/20 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-200/20 rounded-full blur-3xl animate-float-delayed pointer-events-none" />
      <div className="absolute top-40 right-20 w-64 h-64 bg-blue-200/15 rounded-full blur-3xl animate-float-slow pointer-events-none" />

      <div className="w-full max-w-5xl relative z-10">
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50/80 text-indigo-600 text-xs font-semibold mb-6 border border-indigo-100/80 backdrop-blur-sm shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            AI 驱动的智能评审
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
            参赛资料查重与
            <br />
            <span className="gradient-text">创新评估</span>
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed max-w-md mx-auto">
            上传参赛材料，获取方案实质相似度与创新性评估报告
          </p>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
          <TaskCenter />
        </div>

        {/* Feature highlights */}
        <div className="mt-12 grid grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              ),
              title: "多维度分析",
              desc: "五维相似度深度比对",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              ),
              title: "创新性评估",
              desc: "六维创新指标量化",
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              ),
              title: "智能报告",
              desc: "一键生成评审报告",
            },
          ].map((feature) => (
            <div key={feature.title} className="text-center p-4 rounded-xl bg-white/40 backdrop-blur-sm border border-white/60 hover:bg-white/60 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100/50 flex items-center justify-center mx-auto mb-2.5 text-indigo-500">
                {feature.icon}
              </div>
              <p className="text-sm font-semibold text-slate-700">{feature.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
