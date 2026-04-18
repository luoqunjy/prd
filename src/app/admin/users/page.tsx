import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById, getUsers, getPrototypes } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { UserManager } from "@/components/UserManager";

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
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">用户管理</h1>
          <p className="text-gray-500 text-sm mt-1">新增 / 编辑 / 停用系统用户，设置每人可见的原型</p>
        </div>
        <UserManager initialUsers={users} prototypes={prototypes.map(p => ({ id: p.id, name: p.name, slug: p.slug }))} />
      </main>
    </>
  );
}
