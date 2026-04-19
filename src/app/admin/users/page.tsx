import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById, getUsers, getPrototypes } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { UserManager } from "@/components/UserManager";
import { PageHero } from "@/components/PageHero";

export default async function UsersAdminPage() {
  const s = await getSession();
  if (!s.userId) redirect("/login");
  const user = await getUserById(s.userId);
  if (!user || user.role !== "super_admin") redirect("/");

  const users = await getUsers();
  const prototypes = await getPrototypes();

  return (
    <>
      <TopNav userName={user.name} role={user.role} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <PageHero
          title="用户管理"
          subtitle={`管理 ${users.length} 个系统账号 · 配置每个人能看到哪些原型`}
          tip="新增用户就能给客户、同事开独立账号了~"
          luluSize={80}
        />
        <UserManager initialUsers={users} prototypes={prototypes.map(p => ({ id: p.id, name: p.name, slug: p.slug }))} />
      </main>
    </>
  );
}
