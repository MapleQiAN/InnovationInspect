"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getReport, addReviewComment, Report } from "@/lib/api";

const INNOVATION_LABELS: Record<string, string> = {
  problem_definition_innovation: "问题定义创新",
  method_innovation: "方法创新",
  architecture_innovation: "架构创新",
  scenario_migration_innovation: "场景迁移创新",
  engineering_optimization_innovation: "工程优化创新",
  combination_innovation: "组合创新",
};

function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-36 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full"
          style={{ width: `${score * 100}%` }}
        />
      </div>
      <span className="text-sm font-medium w-8 text-right">{(score * 100).toFixed(0)}</span>
    </div>
  );
}

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">报告不存在</p>
      </main>
    );
  }

  const overallScore = report.innovation_result?.overall_innovation_score as number | undefined;
  const riskFlags = report.innovation_result?.risk_flags as string[] | undefined;

  return (
    <main className="max-w-3xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">审核报告</h1>
        {overallScore !== undefined && (
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{(overallScore * 100).toFixed(0)}</p>
            <p className="text-xs text-gray-500">创新性综合得分</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {report.summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">审核摘要</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{report.summary}</p>
        </div>
      )}

      {/* Innovation Dimensions */}
      {Object.keys(INNOVATION_LABELS).some(k => report.innovation_result?.[k] !== undefined) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">创新性六维分析</h2>
          <div className="space-y-3">
            {Object.entries(INNOVATION_LABELS).map(([key, label]) => {
              const score = report.innovation_result?.[key] as number | undefined;
              return score !== undefined ? (
                <ScoreBar key={key} score={score} label={label} />
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Risk Flags */}
      {riskFlags && riskFlags.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <h2 className="font-semibold text-red-800 mb-2">风险提示</h2>
          <ul className="space-y-1">
            {riskFlags.map((f, i) => (
              <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                <span className="mt-0.5">⚠</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conclusion */}
      {report.conclusion && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-2">评估结论</h2>
          <p className="text-sm text-gray-700">{report.conclusion}</p>
        </div>
      )}

      {/* Expert Review */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">专家复核意见</h2>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={comment}
          onChange={(e) => { setComment(e.target.value); setSaved(false); }}
          placeholder="请输入专家复核意见..."
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
        >
          {saving ? "保存中..." : saved ? "✓ 已保存" : "保存意见"}
        </button>
      </div>
    </main>
  );
}
