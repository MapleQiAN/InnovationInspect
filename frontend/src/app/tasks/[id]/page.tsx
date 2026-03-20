"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTaskStatus, getTaskResults, TaskStatus, TaskResults } from "@/lib/api";

const STEP_LABELS: Record<string, string> = {
  parsing: "正在解析文档...",
  extracting_essence: "正在提取方案实质...",
  retrieving_candidates: "正在多源检索候选方案...",
  analyzing_similarity: "正在进行五维相似度分析...",
  evaluating_innovation: "正在评估创新性...",
  generating_report: "正在生成审核报告...",
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    pending: "等待中",
    processing: "分析中",
    completed: "已完成",
    failed: "失败",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
      {labels[status] || status}
    </span>
  );
}

function SimilarityBar({ value, label }: { value: number; label: string }) {
  const color = value > 0.7 ? "bg-red-500" : value > 0.4 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${value * 100}%` }} />
      </div>
      <span className="text-sm font-medium w-10 text-right">{(value * 100).toFixed(0)}%</span>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!status) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">任务不存在</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">分析任务</h1>
        <StatusBadge status={status.status} />
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm text-gray-500">任务 ID：<code className="text-xs bg-gray-100 px-1 rounded">{status.task_id}</code></p>
        {status.current_step && (
          <p className="mt-2 text-sm text-blue-600 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            {STEP_LABELS[status.current_step] || status.current_step}
          </p>
        )}
        {status.error_message && (
          <p className="mt-2 text-sm text-red-600">错误：{status.error_message}</p>
        )}
        {(status.status === "pending" || status.status === "processing") && (
          <p className="mt-3 text-xs text-gray-400">页面将自动刷新，请稍候...</p>
        )}
      </div>

      {/* Results */}
      {results && (
        <>
          {/* Top Candidates */}
          {results.top_candidates.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">相似方案候选（Top 5）</h2>
              <div className="space-y-4">
                {results.top_candidates.map((c, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 truncate max-w-sm">{c.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.similarity > 0.7 ? "bg-red-100 text-red-700" :
                        c.similarity > 0.4 ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {(c.similarity * 100).toFixed(0)}% 相似
                      </span>
                    </div>
                    <SimilarityBar value={c.similarity} label={`来源：${c.source}`} />
                  </div>
                ))}
              </div>
              {results.top_candidates.length === 0 && (
                <p className="text-sm text-gray-400">未发现高相似候选方案</p>
              )}
            </div>
          )}

          {/* Innovation Summary */}
          {results.essence?.innovation && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-3">申报创新点</h2>
              <div className="space-y-2">
                {(results.essence.innovation as { claims?: string[] }).claims?.map((claim, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <p className="text-sm text-gray-700">{claim}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Report Button */}
          {results.report_id && (
            <button
              onClick={() => router.push(`/reports/${results.report_id}`)}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              查看完整审核报告 →
            </button>
          )}
        </>
      )}
    </main>
  );
}
