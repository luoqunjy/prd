"use client";

import { useEffect, useRef } from "react";

type Props = {
  title: string;
  subtitle?: string;
  tip?: string;
  luluSize?: number;
  actions?: React.ReactNode;
  gradient?: "pink" | "blue" | "green";
};

const GRADIENTS: Record<string, string> = {
  pink: "from-pink-50 via-rose-50 to-amber-50 border-pink-100",
  blue: "from-blue-50 via-indigo-50 to-purple-50 border-blue-100",
  green: "from-emerald-50 via-teal-50 to-cyan-50 border-emerald-100",
};

/** 带露露的页面头部区域，用于 admin 等各子页面 */
export function PageHero({ title, subtitle, tip, luluSize = 80, actions, gradient = "pink" }: Props) {
  const luluRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const W = window as any;
      if (W.Mascot && luluRef.current && tip) {
        W.Mascot.mountLulu(luluRef.current, { size: luluSize });
        setTimeout(() => W.Mascot.say("lulu", tip, 5000), 700);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [luluSize, tip]);

  const grad = GRADIENTS[gradient];

  return (
    <div className={`mb-6 rounded-2xl bg-gradient-to-r ${grad} border p-5 md:p-6 flex items-center gap-5`}>
      {tip && <div ref={luluRef} className="flex-shrink-0 hidden sm:block" />}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-600 text-sm md:text-base mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
