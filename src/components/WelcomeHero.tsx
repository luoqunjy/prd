"use client";

import { useEffect, useRef } from "react";

type Props = {
  userName: string;
  totalCount: number;
  passwordCount: number;
  totalSizeMB: number;
};

const GREETINGS = [
  "今天想分享什么原型？",
  "我看看你今天做了什么好东西~",
  "需要传新原型吗？我来帮你",
  "看看最近的访问数据吧",
  "欢迎回来，我一直在这~",
];

function hour() {
  return new Date().getHours();
}
function greet() {
  const h = hour();
  if (h < 6) return "深夜了，累了就睡哦";
  if (h < 12) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

export function WelcomeHero({ userName, totalCount, passwordCount, totalSizeMB }: Props) {
  const luluRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const W = window as any;
      if (W.Mascot && luluRef.current) {
        W.Mascot.mountLulu(luluRef.current, { size: 90 });
        setTimeout(() => {
          const g = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
          W.Mascot.say("lulu", g, 4500);
        }, 700);
      }
    }, 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 border border-pink-100 p-6 md:p-8">
      {/* 装饰 */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-pink-200/30 blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-6">
        {/* 露露 */}
        <div ref={luluRef} className="hidden sm:block flex-shrink-0" />

        {/* 文案 */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
            {greet()}，{userName} <span className="inline-block">👋</span>
          </h1>
          <p className="text-gray-600 mt-1.5 text-sm md:text-base">
            你已经在托管 <strong className="text-primary">{totalCount}</strong> 个原型
            {passwordCount > 0 && <>，其中 <strong className="text-rose-500">{passwordCount}</strong> 个加了密码</>}
            {totalSizeMB > 0 && <>，共 <strong>{totalSizeMB.toFixed(1)} MB</strong></>}
          </p>

          {/* 快捷入口徽章 */}
          <div className="flex flex-wrap gap-2 mt-4">
            <a href="/upload" className="inline-flex items-center gap-1.5 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full text-sm text-gray-700 border border-pink-200 transition">
              📦 <span>上传 zip</span>
            </a>
            <a href="#list" className="inline-flex items-center gap-1.5 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full text-sm text-gray-700 border border-pink-200 transition">
              🗂️ <span>查看原型</span>
            </a>
            <span className="inline-flex items-center gap-1.5 bg-white/50 px-3 py-1.5 rounded-full text-sm text-gray-500 border border-pink-100">
              ✨ 今天已陪你 <CurrentTime />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrentTime() {
  return <span className="font-mono">{new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, "0")}</span>;
}
