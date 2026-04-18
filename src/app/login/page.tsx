"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^1\d{10}$/.test(phone)) { toast.error("请输入 11 位有效手机号"); return; }
    if (!password) { toast.error("请输入密码"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "登录失败"); return; }
      toast.success("欢迎回来");
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-primary text-white items-center justify-center text-2xl font-bold mb-3">🎨</div>
          <h1 className="text-2xl font-semibold text-gray-900">原型托管平台</h1>
          <p className="text-gray-500 text-sm mt-1">上传 · 预览 · 分享你的 HTML 原型</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          <div>
            <label className="label">手机号</label>
            <input
              className="input"
              type="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder="11 位手机号"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="label">密码</label>
            <input
              className="input"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button className="btn btn-primary w-full h-10" disabled={loading}>
            {loading ? "登录中..." : "登 录"}
          </button>
          <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
            没有账号？请联系管理员开通
          </div>
        </form>
      </div>
    </div>
  );
}
