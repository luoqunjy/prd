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

  const linkClass = (href: string) => {
    const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
    return `relative px-3 h-10 inline-flex items-center text-sm font-medium transition ${
      isActive
        ? "text-primary"
        : "text-gray-600 hover:text-gray-900"
    }`;
  };

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="relative h-9 w-9 rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-amber-100 flex items-center justify-center ring-2 ring-pink-200/50 transition group-hover:scale-110 group-hover:rotate-6">
              <img src="/mascot/tuanxiaoman.png" alt="团小满" className="w-8 h-8 object-contain" />
            </span>
            <div>
              <div className="font-semibold text-gray-900 leading-tight">原型托管</div>
              <div className="text-[10px] text-gray-400 leading-tight">团小满陪你</div>
            </div>
          </Link>
          <nav className="flex gap-0">
            <TopNavLink href="/" active={pathname === "/"}>原型列表</TopNavLink>
            <TopNavLink href="/upload" active={pathname?.startsWith("/upload") || false}>上传原型</TopNavLink>
            {role === "super_admin" && (
              <>
                <TopNavLink href="/admin/users" active={pathname?.startsWith("/admin/users") || false}>用户管理</TopNavLink>
                <TopNavLink href="/admin/stats" active={pathname?.startsWith("/admin/stats") || false}>访问统计</TopNavLink>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center font-medium shadow-sm">
              {userName.charAt(0)}
            </div>
            <span className="text-gray-700">{userName}</span>
            {role === "super_admin" && (
              <span className="tag tag-success text-[10px] px-1.5">超管</span>
            )}
          </div>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-900 transition">
            退出
          </button>
        </div>
      </div>
    </header>
  );
}

function TopNavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative px-3 h-10 inline-flex items-center text-sm font-medium transition ${
        active ? "text-primary" : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-gradient-to-r from-primary to-purple-500" />
      )}
    </Link>
  );
}
