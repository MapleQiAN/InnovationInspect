"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTaskStatus, getTaskResults, TaskStatus, TaskResults } from "@/lib/api";

const STEPS = [
  { key: "parsing", label: "解析文档", desc: "提取文档结构与内容", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  { key: "extracting_essence", label: "提取方案实质", desc: "分析核心方案与技术路线", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" },
  { key: "retrieving_candidates", label: "多源检索候选", desc: "跨库检索相似方案", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" },
  { key: "analyzing_similarity", label: "五维相似度分析", desc: "多维度比对评估", icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" },
  { key: "evaluating_innovation", label: "评估创新性", desc: "创新性量化评估", icon: "M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" },
  { key: "generating_report", label: "生成审核报告", desc: "汇总形成完整报告", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" },
];

const STEP_LABELS: Record<string, string> = {
  parsing: "正在解析文档...",
  extracting_essence: "正在提取方案实质...",
  retrieving_candidates: "正在多源检索候选方案...",
  analyzing_similarity: "正在进行五维相似度分析...",
  evaluating_innovation: "正在评估创新性...",
  generating_report: "正在生成审核报告...",
};

function getStepState(
  stepKey: string,
  currentStep: string | null | undefined,
  taskStatus: string
): "done" | "active" | "pending" | "failed" {
  if (taskStatus === "completed") return "done";
  if (taskStatus === "failed") return "failed";

  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);
  const thisIdx = STEPS.findIndex((s) => s.key === stepKey);

  if (thisIdx < currentIdx) return "done";
  if (thisIdx === currentIdx) return "active";
  return "pending";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200/80 shadow-amber-100/50",
    processing: "bg-indigo-50 text-indigo-700 border-indigo-200/80 shadow-indigo-100/50",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-emerald-100/50",
    failed: "bg-red-50 text-red-700 border-red-200/80 shadow-red-100/50",
  };
  const icons: Record<string, React.ReactNode> = {
    pending: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    processing: (
      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    ),
    completed: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    failed: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  };
  const labels: Record<string, string> = {
    pending: "等待中",
    processing: "分析中",
    completed: "已完成",
    failed: "失败",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${styles[status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
      {icons[status]}
      {labels[status] || status}
    </span>
  );
}

function StepProgress({
  currentStep,
  taskStatus,
}: {
  currentStep: string | null | undefined;
  taskStatus: string;
}) {
  const completedCount = taskStatus === "completed"
    ? STEPS.length
    : STEPS.findIndex((s) => s.key === currentStep);
  const progress = Math.max(0, (completedCount / STEPS.length) * 100);

  return (
    <div className="space-y-1">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-full transition-all duration-700 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
          </div>
        </div>
        <span className="text-xs font-bold text-slate-400 tabular-nums w-12 text-right bg-slate-50 px-2 py-0.5 rounded-md">
          {completedCount}/{STEPS.length}
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-0">
        {STEPS.map((step, idx) => {
          const state = getStepState(step.key, currentStep, taskStatus);
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.key} className={`flex gap-4 animate-fade-in-up`} style={{ animationDelay: `${idx * 0.05}s`, animationFillMode: "both" }}>
              {/* Timeline column */}
              <div className="flex flex-col items-center w-9 flex-shrink-0">
                {/* Node */}
                {state === "done" && (
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 border-2 border-emerald-200 shadow-sm shadow-emerald-100">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
                {state === "active" && (
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 border-2 border-indigo-300 shadow-md shadow-indigo-100 animate-glow-pulse">
                    <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-step-pulse" />
                  </div>
                )}
                {state === "pending" && (
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl border-2 border-slate-200 bg-white/80">
                    <span className="w-2 h-2 bg-slate-200 rounded-full" />
                  </div>
                )}
                {state === "failed" && (
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-100 border-2 border-red-200 shadow-sm shadow-red-100">
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                {/* Connector */}
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[24px] my-1.5 rounded-full transition-colors duration-500 ${
                    state === "done" ? "bg-emerald-200" : "bg-slate-200/60"
                  }`} />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-5"}`}>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold leading-9 ${
                    state === "done" ? "text-slate-500" :
                    state === "active" ? "text-indigo-700" :
                    state === "failed" ? "text-red-600" :
                    "text-slate-400"
                  }`}>
                    {step.label}
                  </p>
                </div>
                {state === "active" && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex gap-0.5">
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </div>
                    <p className="text-xs text-indigo-500 font-medium">{STEP_LABELS[step.key]}</p>
                  </div>
                )}
                {state === "done" && (
                  <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SimilarityBar({ value, label }: { value: number; label: string }) {
  const color = value > 0.7
    ? "from-red-400 to-rose-500"
    : value > 0.4
      ? "from-amber-400 to-orange-500"
      : "from-emerald-400 to-teal-500";
  const bgColor = value > 0.7
    ? "bg-red-50"
    : value > 0.4
      ? "bg-amber-50"
      : "bg-emerald-50";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-500 w-28 shrink-0">{label}</span>
      <div className={`flex-1 ${bgColor} rounded-full h-2.5 overflow-hidden`}>
        <div
          className={`bg-gradient-to-r ${color} h-2.5 rounded-full transition-all duration-700 ease-out relative`}
          style={{ width: `${value * 100}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
      <span className="text-sm font-bold tabular-nums w-12 text-right text-slate-700">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

export default function TaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [results, setResults] = useState<TaskResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const s = await getTaskStatus(id);
        if (cancelled) return;
        setStatus(s);
        setLoading(false);
        if (s.status === "completed") {
          const r = await getTaskResults(id);
          if (!cancelled) setResults(r);
        } else if (s.status === "pending" || s.status === "processing") {
          setTimeout(poll, 3000);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-57px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-violet-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-sm text-slate-400 font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <main className="min-h-[calc(100vh-57px)] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">任务不存在</p>
          <p className="text-sm text-slate-400 mt-1">请检查任务 ID 是否正确</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2.5 rounded-xl hover:bg-white/80 text-slate-400 hover:text-slate-600 transition-all duration-200 hover:shadow-sm border border-transparent hover:border-slate-200/60"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">分析任务</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              ID: <code className="text-xs bg-slate-100/80 px-2 py-0.5 rounded-md font-mono border border-slate-200/50">{status.task_id}</code>
            </p>
          </div>
        </div>
        <StatusBadge status={status.status} />
      </div>

      {/* Status Card */}
      <div className="glass-card p-7 animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        <StepProgress currentStep={status.current_step} taskStatus={status.status} />

        {status.error_message && (
          <div className="mt-5 flex items-start gap-3 px-4 py-3.5 bg-red-50/80 rounded-xl border border-red-100 animate-scale-in">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-red-600 font-medium">{status.error_message}</p>
          </div>
        )}

        {(status.status === "pending" || status.status === "processing") && (
          <div className="mt-5 flex items-center gap-2.5 text-xs text-slate-400 bg-slate-50/80 rounded-lg px-3 py-2">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
            页面将自动刷新，请稍候...
          </div>
        )}
      </div>

      {/* Results */}
      {results && (
        <>
          {/* Top Candidates */}
          {results.top_candidates.length > 0 && (
            <div className="glass-card p-7 animate-fade-in-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="section-icon bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200/50">
                  <svg className="w-4.5 h-4.5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </div>
                <div>
                  <h2 className="section-title">相似方案候选</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Top {results.top_candidates.length} 最相似结果</p>
                </div>
              </div>
              <div className="space-y-3">
                {results.top_candidates.map((c, i) => (
                  <div key={i} className="p-4 rounded-xl bg-gradient-to-r from-slate-50/80 to-white/80 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-800 truncate max-w-sm">{c.title}</span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                        c.similarity > 0.7 ? "bg-red-50 text-red-700 border border-red-200/80" :
                        c.similarity > 0.4 ? "bg-amber-50 text-amber-700 border border-amber-200/80" :
                        "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                      }`}>
                        {(c.similarity * 100).toFixed(0)}% 相似
                      </span>
                    </div>
                    <SimilarityBar value={c.similarity} label={`来源：${c.source}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Innovation Summary */}
          {results.essence?.innovation && (
            <div className="glass-card p-7 animate-fade-in-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="section-icon bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200/50">
                  <svg className="w-4.5 h-4.5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </div>
                <div>
                  <h2 className="section-title">申报创新点</h2>
                  <p className="text-xs text-slate-400 mt-0.5">从材料中提取的创新声明</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {(results.essence.innovation as { claims?: string[] }).claims?.map((claim, i) => (
                  <div key={i} className="flex items-start gap-3.5 px-4 py-3.5 bg-gradient-to-r from-slate-50/80 to-white/80 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5 border border-indigo-200/30">
                      <span className="text-xs font-bold text-indigo-600">{i + 1}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{claim}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Report Button */}
          {results.report_id && (
            <button
              onClick={() => router.push(`/reports/${results.report_id}`)}
              className="gradient-btn w-full flex items-center justify-center gap-2.5 py-4 text-base animate-fade-in-up"
              style={{ animationDelay: "0.4s", animationFillMode: "both" }}
            >
              查看完整审核报告
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </>
      )}
    </main>
  );
}
