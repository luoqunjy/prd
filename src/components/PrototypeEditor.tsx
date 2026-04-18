"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Prototype } from "@/lib/types";

function fmtSize(n: number) {
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}
function fmtDate(n: number) {
  return new Date(n).toLocaleString("zh-CN");
}

export function PrototypeEditor({ proto, eventCount }: { proto: Prototype; eventCount: number }) {
  const router = useRouter();
  const coverRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: proto.name,
    description: proto.description,
    entryFile: proto.entryFile,
    accessPassword: proto.accessPassword || "",
    archived: proto.archived,
  });
  const [saving, setSaving] = useState(false);
  const [previewCover, setPreviewCover] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/prototypes/${proto.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          accessPassword: form.accessPassword || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "保存失败"); return; }
      toast.success("已保存");
      router.refresh();
    } finally { setSaving(false); }
  }

  async function uploadCover(f: File) {
    if (!/\.(png|jpe?g|webp|gif)$/i.test(f.name)) { toast.error("只支持 PNG / JPG / WEBP / GIF"); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error("封面图不能超过 5MB"); return; }
    const form = new FormData();
    form.append("cover", f);
    const res = await fetch(`/api/prototypes/${proto.slug}`, { method: "PATCH", body: form });
    if (res.ok) {
      toast.success("封面已更新");
      setPreviewCover(URL.createObjectURL(f));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "上传失败");
    }
  }

  async function regenerateCover() {
    const res = await fetch(`/api/prototypes/${proto.slug}/regen-cover`, { method: "POST" });
    if (res.ok) { toast.success("封面已重新生成"); router.refresh(); }
    else { toast.error("失败"); }
  }

  return (
    <div className="space-y-5">
      {/* 元信息卡片 */}
      <div className="card p-6 grid grid-cols-4 gap-4 text-sm">
        <div><div className="text-gray-500 mb-1">文件数</div><div className="font-medium">{proto.fileCount}</div></div>
        <div><div className="text-gray-500 mb-1">总大小</div><div className="font-medium">{fmtSize(proto.sizeBytes)}</div></div>
        <div><div className="text-gray-500 mb-1">PV (30天)</div><div className="font-medium text-primary">{eventCount}</div></div>
        <div><div className="text-gray-500 mb-1">创建时间</div><div className="font-medium">{fmtDate(proto.createdAt)}</div></div>
      </div>

      {/* 封面 */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">封面图</h3>
        <div className="flex gap-6">
          <div className="w-64 aspect-video bg-gray-100 rounded overflow-hidden flex items-center justify-center">
            {(previewCover || proto.coverUrl) ? (
              <img src={previewCover || proto.coverUrl!} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl opacity-30">🎨</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-gray-500">
              当前：<span className="font-medium">{proto.coverCustom ? "用户自定义" : "系统自动生成"}</span>
            </p>
            <input ref={coverRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
            <div className="flex gap-2">
              <button onClick={() => coverRef.current?.click()} className="btn btn-default">📤 上传自定义封面</button>
              <button onClick={regenerateCover} className="btn btn-default">🔄 重新生成</button>
            </div>
            <p className="text-xs text-gray-400">支持 PNG / JPG / WEBP，最大 5MB。推荐尺寸 16:9，如 800×450</p>
          </div>
        </div>
      </div>

      {/* 基础设置 */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold">基础设置</h3>
        <div>
          <label className="label">名称</label>
          <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">描述</label>
          <textarea className="input min-h-[80px] py-2" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">入口文件</label>
            <input className="input" value={form.entryFile} onChange={e => setForm({ ...form, entryFile: e.target.value })} />
          </div>
          <div>
            <label className="label">独立访问密码</label>
            <input className="input" type="text" value={form.accessPassword}
              onChange={e => setForm({ ...form, accessPassword: e.target.value })}
              placeholder="留空=任何人可访问" />
          </div>
        </div>
        <label className="flex items-center gap-2 pt-2 cursor-pointer">
          <input type="checkbox" checked={form.archived} onChange={e => setForm({ ...form, archived: e.target.checked })} />
          <span className="text-sm">归档（普通用户列表中隐藏，但预览链接仍可访问）</span>
        </label>
        <div className="flex justify-end pt-3 border-t">
          <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? "保存中..." : "保存"}</button>
        </div>
      </div>

      {/* 分享 */}
      <div className="card p-6">
        <h3 className="font-semibold mb-3">分享链接</h3>
        <div className="flex gap-2">
          <input className="input font-mono text-xs" readOnly
            value={typeof window !== "undefined" ? `${location.origin}/p/${proto.slug}/` : `/p/${proto.slug}/`} />
          <button className="btn btn-default" onClick={() => {
            navigator.clipboard.writeText(`${location.origin}/p/${proto.slug}/`);
            toast.success("已复制到剪贴板");
          }}>📋 复制</button>
        </div>
        {proto.accessPassword && (
          <p className="text-xs text-amber-600 mt-2">⚠️ 该原型需要密码才能预览，分享链接时请同时告知密码</p>
        )}
      </div>
    </div>
  );
}
