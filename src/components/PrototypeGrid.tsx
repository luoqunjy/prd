"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Prototype } from "@/lib/types";

type Props = {
  prototypes: Prototype[];
  isAdmin: boolean;
};

function fmtSize(n: number) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

function fmtDate(n: number) {
  return new Date(n).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function PrototypeGrid({ prototypes, isAdmin }: Props) {
  const router = useRouter();
  const [pwdPrompt, setPwdPrompt] = useState<{ slug: string; name: string } | null>(null);
  const [pwdInput, setPwdInput] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function tryOpen(p: Prototype) {
    if (p.accessPassword) {
      setPwdPrompt({ slug: p.slug, name: p.name });
      return;
    }
    openPreview(p.slug);
  }

  function openPreview(slug: string) {
    window.open(`/p/${slug}/`, "_blank", "noopener,noreferrer");
  }

  async function verifyPwd() {
    if (!pwdPrompt) return;
    const res = await fetch(`/api/prototypes/${pwdPrompt.slug}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwdInput }),
    });
    if (res.ok) {
      openPreview(pwdPrompt.slug);
      setPwdPrompt(null);
      setPwdInput("");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "密码错误");
    }
  }

  async function handleDelete(p: Prototype) {
    if (!confirm(`确定删除「${p.name}」？此操作会清除所有文件和统计数据。`)) return;
    setDeleting(p.id);
    try {
      const res = await fetch(`/api/prototypes/${p.slug}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("已删除");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "删除失败");
      }
    } finally { setDeleting(null); }
  }

  if (prototypes.length === 0) {
    return (
      <div className="card p-16 text-center">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">还没有原型</h3>
        <p className="text-gray-500 mb-6">上传你的第一个原型，开始在线展示</p>
        <Link href="/upload" className="btn btn-primary inline-flex">+ 上传原型</Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {prototypes.map(p => (
          <div key={p.id} className="card overflow-hidden hover:shadow-lg transition group">
            <button onClick={() => tryOpen(p)} className="block w-full text-left">
              <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                {p.coverUrl ? (
                  <img src={p.coverUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="flex items-center justify-center h-full text-5xl opacity-30">🎨</div>
                )}
                {p.accessPassword && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded">🔒 需密码</div>
                )}
                {p.archived && (
                  <div className="absolute top-2 left-2 bg-gray-600 text-white text-xs px-2 py-0.5 rounded">已归档</div>
                )}
              </div>
            </button>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 truncate">{p.name}</h3>
              {p.description && <p className="text-sm text-gray-500 line-clamp-2 mt-1 min-h-[2.5rem]">{p.description}</p>}
              <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                <span>{p.fileCount} 个文件 · {fmtSize(p.sizeBytes)}</span>
                <span>{fmtDate(p.updatedAt)}</span>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onClick={() => tryOpen(p)} className="btn btn-default flex-1 h-8 text-xs">打开预览</button>
                <button onClick={() => {
                  const link = `${location.origin}/p/${p.slug}/`;
                  navigator.clipboard.writeText(link);
                  toast.success("链接已复制");
                }} className="btn btn-default h-8 text-xs px-2">📋</button>
                {isAdmin && (
                  <>
                    <Link href={`/admin/prototypes/${p.slug}`} className="btn btn-default h-8 text-xs px-2">⚙️</Link>
                    <button onClick={() => handleDelete(p)} disabled={deleting === p.id} className="btn btn-danger h-8 text-xs px-2">
                      {deleting === p.id ? "..." : "🗑️"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {pwdPrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setPwdPrompt(null)}>
          <div className="card p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">访问受限</h3>
            <p className="text-sm text-gray-500 mb-4">「{pwdPrompt.name}」需要密码才能预览</p>
            <input
              autoFocus
              type="password"
              className="input mb-3"
              placeholder="请输入访问密码"
              value={pwdInput}
              onChange={e => setPwdInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && verifyPwd()}
            />
            <div className="flex gap-2">
              <button onClick={() => { setPwdPrompt(null); setPwdInput(""); }} className="btn btn-default flex-1">取消</button>
              <button onClick={verifyPwd} className="btn btn-primary flex-1">进入</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
