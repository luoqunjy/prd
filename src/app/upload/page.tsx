import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById } from "@/lib/db";
import { ensureSuperAdmin } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { UploadForm } from "@/components/UploadForm";
import { UploadHeader } from "@/components/UploadHeader";

export default async function UploadPage() {
  try { await ensureSuperAdmin(); } catch (e) { console.error("ensureSuperAdmin failed:", e); }
  const s = await getSession();
  if (!s.userId) redirect("/login");
  const user = await getUserById(s.userId);
  if (!user || !user.enabled) redirect("/login");

  // 普通用户也允许上传，上传后自己可见（以及被超管授权的用户）
  return (
    <>
      <TopNav userName={user.name} role={user.role} />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <UploadHeader />
        <UploadForm />
      </main>
    </>
  );
}
