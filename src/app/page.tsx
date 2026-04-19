import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById, getPrototypes } from "@/lib/db";
import { ensureSuperAdmin } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { PrototypeGrid } from "@/components/PrototypeGrid";
import { WelcomeHero } from "@/components/WelcomeHero";

export default async function Home() {
  try { await ensureSuperAdmin(); } catch (e) { console.error("ensureSuperAdmin failed:", e); }

  const s = await getSession();
  if (!s.userId) redirect("/login");

  const user = await getUserById(s.userId);
  if (!user || !user.enabled) redirect("/login");

  const all = await getPrototypes();
  const visibleIds = user.visibleProjectIds || [];
  const visible = user.role === "super_admin"
    ? all
    : all.filter(p => !p.archived && (visibleIds.length === 0 || visibleIds.includes(p.id)));

  // 数据统计
  const totalPrototypes = visible.length;
  const withPassword = visible.filter(p => p.accessPassword).length;
  const totalSize = visible.reduce((s, p) => s + (p.sizeBytes || 0), 0);

  return (
    <>
      <TopNav userName={user.name} role={user.role} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <WelcomeHero
          userName={user.name}
          totalCount={totalPrototypes}
          passwordCount={withPassword}
          totalSizeMB={totalSize / 1024 / 1024}
        />
        <div className="flex items-center justify-between mb-5 mt-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">原型列表</h2>
            <p className="text-gray-500 text-sm mt-0.5">点卡片直接打开，点 📋 复制链接分享</p>
          </div>
          <a href="/upload" className="btn btn-primary shadow-md shadow-primary/20">+ 上传原型</a>
        </div>
        <PrototypeGrid prototypes={visible} isAdmin={user.role === "super_admin"} />
      </main>
    </>
  );
}
