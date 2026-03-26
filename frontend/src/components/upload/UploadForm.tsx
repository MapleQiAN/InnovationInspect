"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { submitTask } from "@/lib/api";

const ACCEPTED_TYPES = ".pdf,.docx,.pptx,.jpg,.jpeg,.png,.zip";

const FILE_ICONS: Record<string, string> = {
  pdf: "text-red-500",
  docx: "text-blue-500",
  pptx: "text-orange-500",
  zip: "text-amber-600",
  jpg: "text-emerald-500",
  jpeg: "text-emerald-500",
  png: "text-emerald-500",
};

export function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    setFiles(Array.from(e.dataTransfer.files));
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    try {
      const task = await submitTask(files);
      router.push(`/tasks/${task.task_id}`);
    } catch {
      setError("提交失败，请检查文件格式后重试");
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getExt = (name: string) => name.split(".").pop()?.toLowerCase() || "";

  return (
    <div className="glass-card p-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="section-icon bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-200/50">
          <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">上传参赛材料</h2>
          <p className="text-xs text-slate-400">支持拖拽或点击上传多个文件</p>
        </div>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 group ${
          dragOver
            ? "border-indigo-400 bg-indigo-50/60 scale-[1.01] shadow-inner shadow-indigo-100/50"
            : files.length > 0
              ? "border-indigo-200 bg-indigo-50/20"
              : "border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20 hover:shadow-inner hover:shadow-indigo-50/50"
        }`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          id="file-input"
          onChange={onFileChange}
        />
        <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
          dragOver
            ? "bg-indigo-100 scale-110 shadow-lg shadow-indigo-200/50"
            : "bg-gradient-to-br from-slate-50 to-slate-100 group-hover:from-indigo-50 group-hover:to-violet-50 group-hover:shadow-md"
        }`}>
          <svg className={`h-7 w-7 transition-all duration-300 ${
            dragOver ? "text-indigo-500 -translate-y-1" : "text-slate-400 group-hover:text-indigo-400"
          }`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-600 mb-1.5">
          拖拽文件到此处，或<span className="text-indigo-600 font-semibold"> 点击上传</span>
        </p>
        <p className="text-xs text-slate-400">
          支持 PDF / DOCX / PPTX / 图片 / ZIP（单文件最大 50MB）
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f, i) => {
            const ext = getExt(f.name);
            const iconColor = FILE_ICONS[ext] || "text-slate-500";
            return (
              <div
                key={f.name}
                className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50/80 to-white/80 rounded-xl group border border-slate-100/80 hover:border-indigo-100 hover:shadow-sm transition-all duration-200 animate-scale-in"
              >
                <div className={`w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm ${iconColor}`}>
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(f.size)}</p>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider mr-1">{ext}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2.5 px-4 py-3 bg-red-50/80 rounded-xl border border-red-100 animate-scale-in">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!files.length || loading}
        className="gradient-btn mt-5 w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            正在提交...
          </span>
        ) : (
          <>
            提交分析
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
