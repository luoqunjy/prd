"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function UploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entryFile, setEntryFile] = useState("index.html");
  const [accessPassword, setAccessPassword] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  function onPickFile(f: File | null) {
    if (!f) return;
    if (!/\.(zip)$/i.test(f.name)) {
      toast.error("仅支持 .zip 格式");
      return;
    }
    if (f.size > 200 * 1024 * 1024) {
      toast.error("文件过大（> 200MB）");
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.zip$/i, ""));
    if (!slug) {
      // slug 只允许 ASCII 字母数字和短横线（中文 URL 在 Vercel 边缘层有兼容性问题）
      let guessed = f.name.replace(/\.zip$/i, "").toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!guessed) guessed = "proto-" + Date.now().toString(36);
      setSlug(guessed);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    onPickFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("请选择压缩包"); return; }
    if (!name.trim()) { toast.error("请填写原型名称"); return; }
    if (!slug.trim() || !/^[a-z0-9-]+$/i.test(slug)) {
      toast.error("Slug 只能含英文字母、数字、短横线（为兼容性不支持中文）"); return;
    }

    setUploading(true);
    setProgress(0);

    const form = new FormData();
    form.append("file", file);
    form.append("slug", slug);
    form.append("name", name);
    form.append("description", description);
    form.append("entryFile", entryFile || "index.html");
    if (accessPassword) form.append("accessPassword", accessPassword);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/prototypes");
      xhr.upload.onprogress = ev => {
        if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
      };
      const res: any = await new Promise((resolve, reject) => {
        xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
        xhr.onerror = () => reject(new Error("网络异常"));
        xhr.send(form);
      });
      if (res.status >= 400) {
        const data = JSON.parse(res.body || "{}");
        toast.error(data.error || "上传失败");
        return;
      }
      toast.success("上传成功！正在跳转...");
      setTimeout(() => router.push("/"), 800);
    } catch (err: any) {
      toast.error(err.message || "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      {/* 拖拽上传 */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition ${
          isDragging ? "border-primary bg-blue-50" : file ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-primary hover:bg-gray-50"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={e => onPickFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <div>
            <div className="text-4xl mb-2">✅</div>
            <div className="font-medium">{file.name}</div>
            <div className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · 点击更换</div>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-2">📦</div>
            <div className="font-medium">点击或拖拽 .zip 压缩包到这里</div>
            <div className="text-sm text-gray-500 mt-1">最大 200MB · 压缩包内需含 index.html</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">原型名称 *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="如：劳务软件 V1.0" />
        </div>
        <div>
          <label className="label">URL Slug *</label>
          <input className="input" value={slug} onChange={e => setSlug(e.target.value)} placeholder="labor-v1" />
          <p className="text-xs text-gray-400 mt-1">预览地址：/p/{slug || "slug"}/</p>
        </div>
      </div>

      <div>
        <label className="label">描述</label>
        <textarea
          className="input min-h-[80px] py-2"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="一句话介绍这个原型，便于后续在列表中识别"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">入口文件</label>
          <input className="input" value={entryFile} onChange={e => setEntryFile(e.target.value)} placeholder="index.html" />
          <p className="text-xs text-gray-400 mt-1">默认 index.html，如原型首页不是则修改</p>
        </div>
        <div>
          <label className="label">独立访问密码 <span className="text-gray-400">(可选)</span></label>
          <input className="input" type="text" value={accessPassword} onChange={e => setAccessPassword(e.target.value)} placeholder="留空=任何人可访问" />
          <p className="text-xs text-gray-400 mt-1">设置后打开预览需验证密码</p>
        </div>
      </div>

      {uploading && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>正在上传...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-3 border-t">
        <button type="button" onClick={() => router.push("/")} className="btn btn-default">取消</button>
        <button type="submit" disabled={uploading || !file} className="btn btn-primary">
          {uploading ? "上传中..." : "确认上传"}
        </button>
      </div>
    </form>
  );
}
