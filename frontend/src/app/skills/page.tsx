"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listSkills, SkillMeta } from "@/lib/api";

const TYPE_LABEL: Record<string, string> = {
  basic: "基础能力",
  core: "核心能力",
};

const TYPE_COLOR: Record<string, string> = {
  basic: "bg-blue-100 text-blue-700",
  core: "bg-purple-100 text-purple-700",
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">OpenClaw Skills</h1>
        <p className="mt-2 text-gray-500">
          已注册 {skills.length} 个技能 · 点击技能查看详情并在线执行
        </p>
      </div>

      {[
        { label: "基础能力 Skills", items: basic },
        { label: "核心能力 Skills", items: core },
      ].map(({ label, items }) => (
        <section key={label} className="mb-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">{label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((skill) => (
              <Link
                key={skill.name}
                href={`/skills/${encodeURIComponent(skill.name)}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-400 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-mono text-sm font-semibold text-gray-800">
                    {skill.name}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[skill.skill_type]}`}
                  >
                    {TYPE_LABEL[skill.skill_type]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {skill.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
