"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const LOGIN_GREETINGS = [
  "嗨~ 登录就能看到你所有原型啦",
  "输入手机号和密码就能进来哦",
  "好久不见呀，今天来传新原型吗？",
  "我在门口等你~",
  "填好进来，有新功能等你",
];

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const luluRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 挂载露露：欢迎登录
    const timer = setTimeout(() => {
      const W = window as any;
      if (W.Mascot && luluRef.current) {
        W.Mascot.mountLulu(luluRef.current, { size: 140 });
        setTimeout(() => {
          const greet = LOGIN_GREETINGS[Math.floor(Math.random() * LOGIN_GREETINGS.length)];
          W.Mascot.say("lulu", greet, 6000);
        }, 900);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, []);

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
      if (!res.ok) {
        toast.error(data.error || "登录失败");
        const W = window as any;
        if (W.Mascot) W.Mascot.say("lulu", "手机号或密码不对哦~", 3000);
        return;
      }
      toast.success("欢迎回来");
      const W = window as any;
      if (W.Mascot) W.Mascot.say("lulu", "走喽~ 马上带你进去!", 2000);
      setTimeout(() => router.push("/"), 600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 p-4 overflow-hidden relative">
      {/* 背景装饰圆 */}
      <div className="absolute top-[10%] right-[8%] w-64 h-64 rounded-full bg-pink-200/30 blur-3xl" />
      <div className="absolute bottom-[10%] left-[10%] w-80 h-80 rounded-full bg-amber-200/30 blur-3xl" />

      <div className="w-full max-w-5xl relative z-10 grid md:grid-cols-[1fr_400px] gap-8 items-center">
        {/* 左侧：露露 IP + 文案 */}
        <div className="hidden md:block text-center md:text-left">
          <div className="relative inline-block" ref={luluRef}></div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 leading-tight">
            原型托管平台
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            拖个 zip，秒变分享链接
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-white/70 backdrop-blur px-4 py-2 rounded-full border border-pink-200 text-sm text-gray-700">
            <span className="text-pink-500">✦</span>
            <span>和团小满、露露一起陪你做产品</span>
          </div>
        </div>

        {/* 右侧：登录卡 */}
        <div>
          <div className="text-center md:hidden mb-6">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 text-white items-center justify-center text-2xl font-bold mb-3 shadow-lg shadow-pink-200">🎨</div>
            <h1 className="text-2xl font-semibold text-gray-900">原型托管平台</h1>
          </div>
          <form onSubmit={handleSubmit} className="card p-7 space-y-5 border border-pink-100 shadow-xl shadow-pink-100/40">
            <div className="flex items-center gap-2 pb-2 border-b border-pink-100">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center text-sm shadow-md shadow-pink-200">🎨</div>
              <div>
                <div className="font-semibold text-gray-900">登录</div>
                <div className="text-xs text-gray-400">用手机号和密码</div>
              </div>
            </div>
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
            <button className="btn btn-primary w-full h-10 shadow-md shadow-primary/20" disabled={loading}>
              {loading ? "登录中..." : "登 录"}
            </button>
            <div className="text-xs text-gray-400 text-center pt-3 border-t border-gray-100">
              没有账号？请联系管理员开通
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
