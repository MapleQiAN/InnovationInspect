"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { submitTask } from "@/lib/api";

const ACCEPTED_TYPES = ".pdf,.docx,.pptx,.jpg,.jpeg,.png,.zip";

export function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setFiles(Array.from(e.dataTransfer.files));
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">上传参赛材料</h2>
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
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
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">
          拖拽或点击上传（支持 PDF / DOCX / PPTX / 图片 / ZIP）
        </p>
        {files.length > 0 && (
          <ul className="mt-3 text-left space-y-1">
            {files.map((f) => (
              <li key={f.name} className="text-sm text-green-600 flex items-center gap-1">
                <span>✓</span> {f.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
      <button
        onClick={handleSubmit}
        disabled={!files.length || loading}
        className="mt-4 w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium
                   hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                   transition-colors"
      >
        {loading ? "正在提交..." : "提交分析"}
      </button>
    </div>
  );
}
