import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById, getPrototypes } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { PrototypeGrid } from "@/components/PrototypeGrid";

export default async function Home() {
  const s = await getSession();
  if (!s.userId) redirect("/login");

  const user = await getUserById(s.userId);
  if (!user || !user.enabled) redirect("/login");

  const all = await getPrototypes();
  const visible = user.role === "super_admin"
    ? all
    : all.filter(p => !p.archived && (user.visibleProjectIds.length === 0 || user.visibleProjectIds.includes(p.id)));

  return (
    <>
      <TopNav userName={user.name} role={user.role} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">原型列表</h1>
            <p className="text-gray-500 text-sm mt-1">共 {visible.length} 个原型 · 点击卡片预览</p>
          </div>
          <a href="/upload" className="btn btn-primary">
            + 上传原型
          </a>
        </div>
        <PrototypeGrid prototypes={visible} isAdmin={user.role === "super_admin"} />
      </main>
    </>
  );
}
