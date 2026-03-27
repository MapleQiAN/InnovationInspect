"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listReports, ReportListItem } from "@/lib/api";

export default function HistoryPage() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-57px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-violet-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-sm text-slate-400 font-medium">加载项目列表...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-57px)] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">加载失败</p>
          <p className="text-sm text-slate-400 mt-1">请检查网络连接后重试</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <a href="/" className="p-2.5 rounded-xl hover:bg-white/80 text-slate-400 hover:text-slate-600 transition-all duration-200 hover:shadow-sm border border-transparent hover:border-slate-200/60">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </a>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">已处理项目</h1>
            <p className="text-sm text-slate-400 mt-0.5">共 {reports.length} 个项目</p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {reports.length === 0 && (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">暂无已处理项目</p>
          <p className="text-sm text-slate-400 mt-1">上传材料后，处理完成的项目将显示在这里</p>
          <a href="/" className="inline-block mt-6 gradient-btn text-sm px-6">去上传材料</a>
        </div>
      )}

      {/* Report List */}
      <div className="space-y-3">
        {reports.map((r, i) => {
          const scorePercent = r.overall_score != null ? Math.round(r.overall_score * 100) : null;
          const summaryText = r.summary
            ? r.summary.replace(/[#*_`>\-\[\]()]/g, "").slice(0, 120) + (r.summary.length > 120 ? "..." : "")
            : "暂无摘要";
          const date = new Date(r.created_at);
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

          return (
            <div
              key={r.id}
              onClick={() => router.push(`/reports/${r.id}`)}
              className="glass-card p-5 cursor-pointer hover:shadow-lg hover:shadow-indigo-100/40 hover:border-indigo-200/60 transition-all duration-300 group animate-fade-in-up"
              style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}
            >
              <div className="flex items-center gap-4">
                {/* Score Badge */}
                <div className="flex-shrink-0">
                  {scorePercent != null ? (
                    <div className="relative w-12 h-12">
                      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                        <circle
                          cx="18" cy="18" r="15" fill="none"
                          stroke={scorePercent >= 70 ? "#6366f1" : scorePercent >= 40 ? "#f59e0b" : "#ef4444"}
                          strokeWidth="2.5"
                          strokeDasharray={`${(scorePercent / 100) * 94.25} 94.25`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">{scorePercent}</span>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-xs text-slate-400 font-medium">N/A</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                      报告 {r.id.slice(0, 8)}
                    </h3>
                    {r.reviewer_comment && (
                      <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/50">
                        已复核
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{summaryText}</p>
                </div>

                {/* Date & Arrow */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  <span className="text-xs text-slate-400 whitespace-nowrap">{dateStr}</span>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
