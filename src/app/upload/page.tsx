import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { UploadForm } from "@/components/UploadForm";

export default async function UploadPage() {
  const s = await getSession();
  if (!s.userId) redirect("/login");
  const user = await getUserById(s.userId);
  if (!user || !user.enabled) redirect("/login");

  // 普通用户也允许上传，上传后自己可见（以及被超管授权的用户）
  return (
    <>
      <TopNav userName={user.name} role={user.role} />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">上传原型</h1>
          <p className="text-gray-500 text-sm mt-1">拖拽或选择 zip 压缩包，上传后自动托管并生成预览链接</p>
        </div>
        <UploadForm />
      </main>
    </>
  );
}
