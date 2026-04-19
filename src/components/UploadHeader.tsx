"use client";

import { useEffect, useRef } from "react";

const UPLOAD_TIPS = [
  "拖个 zip 上来，我帮你拆~",
  "支持 Axure / HTML / 静态网页",
  "上传完能直接拿到分享链接哦",
  "大 zip 会自动分片，不用担心",
];

export function UploadHeader() {
  const luluRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const W = window as any;
      if (W.Mascot && luluRef.current) {
        W.Mascot.mountLulu(luluRef.current, { size: 80 });
        setTimeout(() => {
          const tip = UPLOAD_TIPS[Math.floor(Math.random() * UPLOAD_TIPS.length)];
          W.Mascot.say("lulu", tip, 5000);
        }, 700);
      }
    }, 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mb-6">
      <div className="flex items-start gap-4 bg-gradient-to-r from-pink-50 to-amber-50 border border-pink-100 rounded-2xl p-5">
        <div ref={luluRef} className="flex-shrink-0" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">上传原型</h1>
          <p className="text-gray-600 text-sm mt-1">拖拽 zip 压缩包到下方区域，上传后自动生成预览链接，复制发给任何人。</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Tag>✅ 兼容 Axure 导出</Tag>
            <Tag>✅ 最大 200MB</Tag>
            <Tag>✅ 可设独立访问密码</Tag>
            <Tag>✅ 自动封面 + 自动统计</Tag>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center bg-white/80 px-2.5 py-1 rounded-full text-xs text-gray-700 border border-pink-200">
      {children}
    </span>
  );
}
