"use client";

import Link from "next/link";
import { TaskListItem } from "@/lib/api";

const STATUS_LABELS: Record<TaskListItem["status"], string> = {
  pending: "等待中",
  processing: "分析中",
  completed: "已完成",
  failed: "失败",
};

const STEP_LABELS: Record<string, string> = {
  parsing: "解析文档",
  extracting_essence: "提取方案实质",
  retrieving_candidates: "检索候选方案",
  analyzing_similarity: "分析相似度",
  evaluating_innovation: "评估创新性",
  generating_report: "生成审核报告",
};

function formatTaskTitle(task: TaskListItem) {
  const primaryFilename = task.primary_filename || "未命名材料";
  if (task.document_count <= 1) return primaryFilename;
  return `${primaryFilename} 等 ${task.document_count} 个文件`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClasses(status: TaskListItem["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "failed":
      return "bg-red-50 text-red-700 border-red-200";
    case "processing":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

type TaskListProps = {
  tasks: TaskListItem[];
  loading: boolean;
};

export function TaskList({ tasks, loading }: TaskListProps) {
  if (loading) {
    return (
      <div className="glass-card p-7">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">任务总览</h2>
            <p className="text-sm text-slate-400">正在加载已有任务...</p>
          </div>
          <div className="w-9 h-9 rounded-xl border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="glass-card p-7">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">任务总览</h2>
        <p className="text-sm text-slate-500">还没有分析任务。上传一批材料后，新的任务会出现在这里。</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-7">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">任务总览</h2>
          <p className="text-sm text-slate-400">可以连续创建新任务，系统会并发分析不同任务。</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          共 {tasks.length} 个任务
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const stepLabel = task.current_step ? STEP_LABELS[task.current_step] || task.current_step : "等待进入下一阶段";

          return (
            <div
              key={task.task_id}
              className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm shadow-slate-100/60 transition-all duration-200 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/40"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="truncate text-base font-semibold text-slate-800">{formatTaskTitle(task)}</h3>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(task.status)}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span>任务 ID：{task.task_id.slice(0, 8)}</span>
                    <span>文件数：{task.document_count}</span>
                    <span>创建于：{formatTime(task.created_at)}</span>
                  </div>

                  <p className="mt-3 text-sm text-slate-600">
                    当前阶段：
                    <span className="ml-1 font-medium text-slate-800">{stepLabel}</span>
                  </p>

                  {task.error_message && (
                    <p className="mt-3 rounded-xl border border-red-100 bg-red-50/80 px-3 py-2 text-sm text-red-600">
                      失败原因：{task.error_message}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/tasks/${task.task_id}`}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-600"
                  >
                    查看详情
                  </Link>
                  {task.report_id && (
                    <Link
                      href={`/reports/${task.report_id}`}
                      className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-2 text-sm font-medium text-white shadow-md shadow-indigo-200/60 transition-transform hover:-translate-y-0.5"
                    >
                      查看报告
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
