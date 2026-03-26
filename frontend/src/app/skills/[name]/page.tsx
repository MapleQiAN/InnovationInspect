"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getSkill,
  executeSkill,
  SkillMeta,
  SkillExecuteResponse,
} from "@/lib/api";

export default function SkillDetailPage() {
  const { name } = useParams<{ name: string }>();
  const skillName = decodeURIComponent(name);
  const [skill, setSkill] = useState<SkillMeta | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SkillExecuteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    getSkill(skillName)
      .then(setSkill)
      .catch(() => setFetchError("Skill not found"));
  }, [skillName]);

  if (fetchError)
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <Link href="/skills" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          返回技能列表
        </Link>
        <div className="mt-8 flex items-center gap-3 px-4 py-3.5 bg-red-50/80 rounded-xl border border-red-100">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm text-red-600 font-medium">{fetchError}</p>
        </div>
      </div>
    );

  if (!skill)
    return (
      <div className="min-h-[calc(100vh-57px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-violet-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-sm text-slate-400 font-medium">加载技能详情...</p>
        </div>
      </div>
    );

  const properties =
    (skill.input_schema as Record<string, unknown>)?.properties ?? {};
  const propEntries = Object.entries(
    properties as Record<string, { type?: string; description?: string }>
  );
  const required: string[] =
    ((skill.input_schema as Record<string, unknown>)?.required as string[]) ??
    [];

  const handleExecute = async () => {
    setLoading(true);
    setResult(null);
    try {
      const parsed: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(inputs)) {
        if (v === "") continue;
        if (v === "true") parsed[k] = true;
        else if (v === "false") parsed[k] = false;
        else if (!isNaN(Number(v)) && v.trim() !== "") parsed[k] = Number(v);
        else parsed[k] = v;
      }
      const res = await executeSkill(skillName, parsed);
      setResult(res);
    } catch (e: unknown) {
      const axiosErr = e as { response?: { data?: { detail?: string } }; message?: string };
      setResult({
        skill_name: skillName,
        success: false,
        data: null,
        error: axiosErr?.response?.data?.detail ?? axiosErr?.message ?? "Unknown error",
        duration_ms: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/skills" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors animate-fade-in">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        返回技能列表
      </Link>

      <div className="mt-6 mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="section-icon bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200/50">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                {skill.name}
              </h1>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  skill.skill_type === "core"
                    ? "bg-violet-50 text-violet-700 border border-violet-200/60"
                    : "bg-blue-50 text-blue-700 border border-blue-200/60"
                }`}
              >
                {skill.skill_type === "core" ? "核心能力" : "基础能力"}
              </span>
            </div>
            <p className="mt-1 text-slate-500 text-sm">{skill.description}</p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <section className="glass-card p-7 mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="section-icon bg-gradient-to-br from-slate-100 to-gray-100 border border-slate-200/50">
            <svg className="w-4.5 h-4.5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </div>
          <h2 className="section-title">执行参数</h2>
        </div>
        {propEntries.length === 0 ? (
          <div className="text-center py-6 bg-slate-50/50 rounded-xl border border-slate-100/80">
            <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-slate-400">此技能无需输入参数</p>
          </div>
        ) : (
          <div className="space-y-4">
            {propEntries.map(([key, prop]) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {key}
                  {required.includes(key) && (
                    <span className="text-red-400 ml-1">*</span>
                  )}
                </label>
                {prop?.description && (
                  <p className="text-xs text-slate-400 mb-1.5">
                    {prop.description}
                  </p>
                )}
                <textarea
                  rows={2}
                  className="w-full border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm font-mono
                             focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 focus:outline-none
                             bg-slate-50/50 hover:border-slate-300 transition-all duration-200
                             placeholder:text-slate-400"
                  placeholder={
                    prop?.type === "integer" ? "数字" : "输入值..."
                  }
                  value={inputs[key] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleExecute}
          disabled={loading}
          className="gradient-btn mt-6 flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? "执行中..." : "执行 Skill"}
        </button>
      </section>

      {/* Result */}
      {result && (
        <section className="glass-card p-7 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`section-icon ${result.success
                ? "bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/50"
                : "bg-gradient-to-br from-red-100 to-rose-100 border border-red-200/50"
              }`}>
                {result.success ? (
                  <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4.5 h-4.5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                )}
              </div>
              <h2 className="section-title">执行结果</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                {result.duration_ms} ms
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                  result.success
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    : "bg-red-50 text-red-700 border border-red-200/60"
                }`}
              >
                {result.success ? "成功" : "失败"}
              </span>
            </div>
          </div>
          {result.error && (
            <div className="mb-4 flex items-start gap-3 p-3.5 bg-red-50/80 border border-red-100 rounded-xl">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-700 font-medium">{result.error}</p>
            </div>
          )}
          <pre className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-4 text-xs overflow-auto max-h-80 text-slate-700 font-mono leading-relaxed">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
