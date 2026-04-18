"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

type Props = {
  userName: string;
  role: "super_admin" | "user";
};

export function TopNav({ userName, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("已退出登录");
    router.push("/login");
  }

  const linkClass = (href: string) =>
    `px-3 h-10 inline-flex items-center text-sm font-medium transition ${
      pathname === href || (href !== "/" && pathname?.startsWith(href))
        ? "text-primary border-b-2 border-primary"
        : "text-gray-600 hover:text-gray-900"
    }`;

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-primary text-white font-bold flex items-center justify-center">🎨</span>
            <span className="font-semibold text-gray-900">原型托管</span>
          </Link>
          <nav className="flex gap-1">
            <Link href="/" className={linkClass("/")}>原型列表</Link>
            <Link href="/upload" className={linkClass("/upload")}>上传原型</Link>
            {role === "super_admin" && (
              <>
                <Link href="/admin/users" className={linkClass("/admin/users")}>用户管理</Link>
                <Link href="/admin/stats" className={linkClass("/admin/stats")}>访问统计</Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {userName}
            {role === "super_admin" && <span className="ml-1 tag tag-success">超管</span>}
          </span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-900">退出</button>
        </div>
      </div>
    </header>
  );
}
