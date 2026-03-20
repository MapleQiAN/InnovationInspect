import { UploadForm } from "@/components/upload/UploadForm";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            参赛资料查重与创新评估系统
          </h1>
          <p className="text-gray-500">
            上传参赛材料，获取方案实质相似度与创新性评估报告
          </p>
        </div>
        <UploadForm />
      </div>
    </main>
  );
}
