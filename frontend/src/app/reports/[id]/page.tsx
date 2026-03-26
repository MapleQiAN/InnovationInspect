"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getReport, addReviewComment, Report } from "@/lib/api";


export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReport(id).then((r) => {
      setReport(r);
      setComment(r.reviewer_comment || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    await addReviewComment(report.id, comment);
    setSaving(false);
    setSaved(true);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-57px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-violet-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-sm text-slate-400 font-medium">加载报告中...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <main className="min-h-[calc(100vh-57px)] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">报告不存在</p>
          <p className="text-sm text-slate-400 mt-1">请检查报告链接是否正确</p>
        </div>
      </main>
    );
  }

  const overallScore = report.innovation_result?.overall_innovation_score as number | undefined;
  const riskFlags = report.innovation_result?.risk_flags as string[] | undefined;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <a href="/" className="p-2.5 rounded-xl hover:bg-white/80 text-slate-400 hover:text-slate-600 transition-all duration-200 hover:shadow-sm border border-transparent hover:border-slate-200/60">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </a>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">审核报告</h1>
        </div>
        {overallScore !== undefined && (
          <div className="flex items-center gap-3 px-5 py-3 glass-card animate-glow-pulse">
            <div className="relative">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke="url(#scoreGrad)"
                  strokeWidth="3"
                  strokeDasharray={`${overallScore * 94.25} 94.25`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold gradient-text">
                {(overallScore * 100).toFixed(0)}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium leading-tight">创新性</p>
              <p className="text-xs text-slate-400 leading-tight">综合得分</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {report.summary && (
        <div className="glass-card p-7 animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="section-icon bg-gradient-to-br from-indigo-100 to-blue-100 border border-indigo-200/50">
              <svg className="w-4.5 h-4.5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <h2 className="section-title">审核摘要</h2>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed bg-slate-50/50 rounded-xl p-4 border border-slate-100/80 prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-headings:font-semibold prose-p:text-slate-700 prose-strong:text-slate-800 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
            <ReactMarkdown>{report.summary as string}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Innovation Assessment */}
      {report.innovation_result?.assessment && (
        <div className="glass-card p-7 animate-fade-in-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="section-icon bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200/50">
              <svg className="w-4.5 h-4.5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <div>
              <h2 className="section-title">创新性综合评价</h2>
              <p className="text-xs text-slate-400 mt-0.5">基于全文通读的深度分析</p>
            </div>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed bg-violet-50/30 rounded-xl p-4 border border-violet-100/60 prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-headings:font-semibold prose-p:text-slate-700 prose-strong:text-slate-800 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
            <ReactMarkdown>{report.innovation_result.assessment as string}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      {((report.innovation_result?.strengths as string[] | undefined)?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
          {/* Strengths */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/50 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-700">亮点</h3>
            </div>
            <div className="space-y-2">
              {(report.innovation_result.strengths as string[]).map((s: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 bg-emerald-50/40 rounded-lg border border-emerald-100/60">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-slate-700">{s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses */}
          {((report.innovation_result?.weaknesses as string[] | undefined)?.length ?? 0) > 0 && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-slate-700">不足</h3>
              </div>
              <div className="space-y-2">
                {(report.innovation_result.weaknesses as string[]).map((w: string, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50/40 rounded-lg border border-amber-100/60">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-slate-700">{w}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk Flags */}
      {riskFlags && riskFlags.length > 0 && (
        <div className="bg-gradient-to-br from-red-50/80 to-rose-50/60 backdrop-blur-xl rounded-2xl shadow-lg shadow-red-100/30 border border-red-200/50 p-7 animate-fade-in-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="section-icon bg-gradient-to-br from-red-100 to-rose-100 border border-red-200/50">
              <svg className="w-4.5 h-4.5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-red-800">风险提示</h2>
          </div>
          <div className="space-y-2">
            {riskFlags.map((f, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 bg-white/60 rounded-xl border border-red-100/80 hover:bg-white/80 transition-colors">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-red-700">{f}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conclusion */}
      {report.conclusion && (
        <div className="glass-card p-7 animate-fade-in-up" style={{ animationDelay: "0.35s", animationFillMode: "both" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="section-icon bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/50">
              <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <h2 className="section-title">评估结论</h2>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed bg-emerald-50/30 rounded-xl p-4 border border-emerald-100/60">{report.conclusion}</p>
        </div>
      )}

      {/* Expert Review */}
      <div className="glass-card p-7 animate-fade-in-up" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="section-icon bg-gradient-to-br from-slate-100 to-gray-100 border border-slate-200/50">
            <svg className="w-4.5 h-4.5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </div>
          <h2 className="section-title">专家复核意见</h2>
        </div>
        <textarea
          className="w-full border border-slate-200/80 rounded-xl p-4 text-sm min-h-28 resize-none
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300
                     bg-slate-50/50 placeholder:text-slate-400 transition-all duration-200
                     hover:border-slate-300"
          value={comment}
          onChange={(e) => { setComment(e.target.value); setSaved(false); }}
          placeholder="请输入专家复核意见..."
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="gradient-btn text-sm px-6"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                保存中...
              </span>
            ) : "保存意见"}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium animate-scale-in">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              已保存
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
