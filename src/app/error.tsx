"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Page Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">出错了</h1>
        <p className="text-gray-600 mb-4">
          页面加载失败。常见原因：
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside mb-6 space-y-1">
          <li>还没配置 Vercel KV（数据库），冷启动时 /tmp 被清空</li>
          <li>SESSION_SECRET 配置错误</li>
          <li>Session cookie 过期</li>
        </ul>
        {error?.message && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4 text-xs font-mono text-gray-700 break-all">
            {error.message}
            {error.digest && <div className="mt-1 text-gray-400">Digest: {error.digest}</div>}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={reset} className="flex-1 h-10 bg-blue-600 text-white rounded hover:bg-blue-700">
            重试
          </button>
          <a href="/login" className="flex-1 h-10 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center">
            回登录页
          </a>
        </div>
      </div>
    </div>
  );
}
