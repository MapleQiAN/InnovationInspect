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
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/skills" className="text-sm text-blue-600 hover:underline">
          &larr; 返回技能列表
        </Link>
        <p className="mt-4 text-red-500">{fetchError}</p>
      </div>
    );

  if (!skill)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
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
      <Link href="/skills" className="text-sm text-blue-600 hover:underline">
        &larr; 返回技能列表
      </Link>

      <div className="mt-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono text-gray-900">
            {skill.name}
          </h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              skill.skill_type === "core"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {skill.skill_type === "core" ? "核心能力" : "基础能力"}
          </span>
        </div>
        <p className="mt-2 text-gray-500">{skill.description}</p>
      </div>

      {/* Input Form */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">执行参数</h2>
        {propEntries.length === 0 ? (
          <p className="text-sm text-gray-400">此技能无需输入参数</p>
        ) : (
          <div className="space-y-4">
            {propEntries.map(([key, prop]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key}
                  {required.includes(key) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                {prop?.description && (
                  <p className="text-xs text-gray-400 mb-1">
                    {prop.description}
                  </p>
                )}
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-400 focus:outline-none"
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
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          )}
          {loading ? "执行中..." : "执行 Skill"}
        </button>
      </section>

      {/* Result */}
      {result && (
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">执行结果</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {result.duration_ms} ms
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  result.success
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {result.success ? "成功" : "失败"}
              </span>
            </div>
          </div>
          {result.error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {result.error}
            </div>
          )}
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs overflow-auto max-h-80 text-gray-800">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
