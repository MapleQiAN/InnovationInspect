"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listSkills, SkillMeta } from "@/lib/api";

const TYPE_LABEL: Record<string, string> = {
  basic: "基础能力",
  core: "核心能力",
};

const TYPE_COLOR: Record<string, string> = {
  basic: "bg-blue-50 text-blue-700 border border-blue-200/60",
  core: "bg-violet-50 text-violet-700 border border-violet-200/60",
};

const TYPE_ICON_BG: Record<string, string> = {
  basic: "from-blue-400 to-indigo-500",
  core: "from-violet-500 to-purple-600",
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSkills()
      .then(setSkills)
      .finally(() => setLoading(false));
  }, []);

  const basic = skills.filter((s) => s.skill_type === "basic");
  const core = skills.filter((s) => s.skill_type === "core");

  if (loading)
    return (
      <div className="min-h-[calc(100vh-57px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-violet-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <p className="text-sm text-slate-400 font-medium">加载技能列表...</p>
        </div>
      </div>
    );

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-10 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="section-icon bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200/50">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">OpenClaw Skills</h1>
        </div>
        <p className="mt-2 text-slate-500 ml-12">
          已注册 <span className="font-semibold text-indigo-600">{skills.length}</span> 个技能 · 点击技能查看详情并在线执行
        </p>
      </div>

      {[
        { label: "基础能力 Skills", type: "basic", items: basic, desc: "系统基础功能模块" },
        { label: "核心能力 Skills", type: "core", items: core, desc: "查重评估核心分析能力" },
      ].map(({ label, type, items, desc }, sectionIdx) => (
        <section key={label} className="mb-10 animate-fade-in-up" style={{ animationDelay: `${(sectionIdx + 1) * 0.1}s`, animationFillMode: "both" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-1.5 h-6 rounded-full bg-gradient-to-b ${TYPE_ICON_BG[type]}`} />
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{label}</h2>
              <p className="text-xs text-slate-400">{desc}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((skill, i) => (
              <Link
                key={skill.name}
                href={`/skills/${encodeURIComponent(skill.name)}`}
                className="glass-card-hover p-5 block animate-fade-in-up"
                style={{ animationDelay: `${(sectionIdx * 0.1) + (i * 0.05)}s`, animationFillMode: "both" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-sm font-semibold text-slate-800">
                    {skill.name}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TYPE_COLOR[skill.skill_type]}`}
                  >
                    {TYPE_LABEL[skill.skill_type]}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                  {skill.description}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>查看详情</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
