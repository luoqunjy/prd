"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import JSZip from "jszip";

const CONCURRENCY = 12;        // 并发上传数
const MAX_FILE_SIZE = 4 * 1024 * 1024;  // 单文件 4MB 上限（超过会被跳过）
const MAX_TOTAL_SIZE = 200 * 1024 * 1024;
const ENTRY_CANDIDATES = ["index.html", "index.htm", "start.html", "main.html", "home.html"];

// 跳过这些无意义的垃圾文件
function isJunkPath(name: string): boolean {
  if (name.startsWith("__MACOSX/")) return true;
  if (name === ".DS_Store" || name.endsWith("/.DS_Store") || name.includes("/.DS_Store")) return true;
  if (name.endsWith("Thumbs.db") || name.endsWith(".AppleDouble")) return true;
  // 嵌套 zip 通常是 Axure 导出时附带的备份，预览用不到
  if (/\.(zip|rp|rplib|7z|rar|tar|gz)$/i.test(name)) return true;
  return false;
}

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
  const [phase, setPhase] = useState("");

  function onPickFile(f: File | null) {
    if (!f) return;
    if (!/\.(zip)$/i.test(f.name)) { toast.error("仅支持 .zip 格式"); return; }
    if (f.size > MAX_TOTAL_SIZE) { toast.error(`文件过大（> ${MAX_TOTAL_SIZE/1024/1024}MB）`); return; }
    setFile(f);
    if (!name) setName(f.name.replace(/\.zip$/i, ""));
    if (!slug) {
      let guessed = f.name.replace(/\.zip$/i, "").toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!guessed) guessed = "proto-" + Date.now().toString(36);
      setSlug(guessed);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    onPickFile(e.dataTransfer.files?.[0] || null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("请选择压缩包"); return; }
    if (!name.trim()) { toast.error("请填写原型名称"); return; }
    if (!slug.trim() || !/^[a-z0-9-]+$/i.test(slug)) {
      toast.error("Slug 只能含英文字母、数字、短横线"); return;
    }

    setUploading(true);
    setProgress(0);
    setPhase("解压中...");

    try {
      // 1. 浏览器本地解压 zip
      const zip = await JSZip.loadAsync(file);
      const rawEntries = Object.entries(zip.files).filter(([, f]) => !f.dir);
      const junkCount = rawEntries.filter(([n]) => isJunkPath(n)).length;
      const allEntries = rawEntries.filter(([n]) => !isJunkPath(n));

      if (allEntries.length === 0) { toast.error("压缩包内没有可用文件"); setUploading(false); return; }
      if (junkCount > 0) console.log(`已跳过 ${junkCount} 个垃圾/嵌套压缩文件`);

      // 剥离单一顶级目录（如 "项目名/"）
      const topDirs = new Set(allEntries.map(([n]) => n.split("/")[0]));
      let stripPrefix = "";
      if (topDirs.size === 1) {
        const only = [...topDirs][0];
        if (allEntries.every(([n]) => n.startsWith(only + "/"))) stripPrefix = only + "/";
      }

      // 构建上传任务
      const tasks = allEntries.map(([entryName, zipObj]) => ({
        entryName,
        zipObj,
        relativePath: entryName.slice(stripPrefix.length),
      })).filter(t => t.relativePath);

      // 自动识别入口文件
      let detectedEntry = "";
      const cands = [entryFile, ...ENTRY_CANDIDATES];
      for (const c of cands) {
        const hit = tasks.find(t => t.relativePath.toLowerCase() === c.toLowerCase());
        if (hit) { detectedEntry = hit.relativePath; break; }
      }
      if (!detectedEntry) {
        const firstHtml = tasks.map(t => t.relativePath)
          .filter(p => /\.html?$/i.test(p))
          .sort((a, b) => a.length - b.length)[0];
        if (firstHtml) detectedEntry = firstHtml;
      }
      if (!detectedEntry) { toast.error("压缩包内未找到 HTML 入口文件"); setUploading(false); return; }

      // 超大文件跳过（不阻塞）
      const finalTasks: typeof tasks = [];
      const skipped: string[] = [];
      for (const t of tasks) {
        const size = (t.zipObj as any)._data?.uncompressedSize || 0;
        if (size > MAX_FILE_SIZE) skipped.push(`${t.relativePath} (${(size/1024/1024).toFixed(1)}MB)`);
        else finalTasks.push(t);
      }
      if (skipped.length > 0) {
        toast.warning(`已跳过 ${skipped.length} 个超 4MB 大文件：${skipped.slice(0,3).join(", ")}${skipped.length>3 ? ` 等` : ""}`);
        console.log("skipped files:", skipped);
      }

      const finalTaskCount = finalTasks.length;
      if (finalTaskCount > 3000) {
        const confirmed = confirm(`解压后有 ${finalTaskCount} 个文件（Axure 导出通常很大），预计上传需要 3-10 分钟。是否继续？`);
        if (!confirmed) { setUploading(false); return; }
      }

      // 2. 并发上传
      setPhase(`上传中 (0/${finalTaskCount})`);
      let completed = 0;
      let totalBytes = 0;
      let failedCount = 0;

      async function uploadOne(task: typeof tasks[0]) {
        try {
          const blob = await task.zipObj.async("blob");
          totalBytes += blob.size;
          const formData = new FormData();
          formData.append("slug", slug);
          formData.append("path", task.relativePath);
          formData.append("file", blob, task.relativePath.split("/").pop() || "file");
          const res = await fetch("/api/prototypes/upload-chunk", { method: "POST", body: formData });
          if (!res.ok) {
            failedCount++;
            const err = await res.json().catch(() => ({}));
            console.error(`upload ${task.relativePath} failed:`, err);
            throw new Error(err.error || `HTTP ${res.status}`);
          }
        } finally {
          completed++;
          setProgress(Math.round((completed / finalTaskCount) * 100));
          setPhase(`上传中 (${completed}/${finalTaskCount})`);
        }
      }

      // 并发 worker pool
      const queue = [...finalTasks];
      const workers = Array(Math.min(CONCURRENCY, queue.length)).fill(null).map(async () => {
        while (queue.length > 0) {
          const t = queue.shift();
          if (t) {
            try { await uploadOne(t); } catch {}
          }
        }
      });
      await Promise.all(workers);

      if (failedCount > 0 && failedCount > finalTaskCount * 0.1) {
        toast.error(`${failedCount} 个文件上传失败，请重试`);
        setUploading(false); return;
      }
      if (failedCount > 0) {
        toast.warning(`${failedCount} 个文件上传失败（其余已成功）`);
      }

      // 3. Finalize 创建元数据
      setPhase("保存元数据...");
      const finalRes = await fetch("/api/prototypes/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, name: name.trim(), description: description.trim(),
          entryFile: detectedEntry,
          accessPassword: accessPassword || null,
          fileCount: finalTaskCount,
          sizeBytes: totalBytes,
        }),
      });
      const finalData = await finalRes.json();
      if (!finalRes.ok) { toast.error(finalData.error || "保存失败"); setUploading(false); return; }

      toast.success(`上传成功！${finalTaskCount} 个文件，${(totalBytes/1024/1024).toFixed(1)}MB`);
      setTimeout(() => router.push("/"), 800);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "上传失败");
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition ${
          isDragging ? "border-primary bg-blue-50" : file ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-primary hover:bg-gray-50"
        }`}
      >
        <input ref={fileRef} type="file" accept=".zip" className="hidden"
          onChange={e => onPickFile(e.target.files?.[0] || null)} />
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
            <div className="text-sm text-gray-500 mt-1">最大 200MB · 兼容 Axure 导出、劳务软件原型等</div>
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
          <p className="text-xs text-gray-400 mt-1">预览地址：/p/{slug || "slug"}/ （只能英文字母数字短横线）</p>
        </div>
      </div>

      <div>
        <label className="label">描述</label>
        <textarea className="input min-h-[80px] py-2" value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="一句话介绍这个原型，便于后续在列表中识别" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">入口文件（可留空，自动识别）</label>
          <input className="input" value={entryFile} onChange={e => setEntryFile(e.target.value)} placeholder="index.html" />
          <p className="text-xs text-gray-400 mt-1">Axure 一般是 index.html 或 start.html</p>
        </div>
        <div>
          <label className="label">独立访问密码 <span className="text-gray-400">(可选)</span></label>
          <input className="input" type="text" value={accessPassword}
            onChange={e => setAccessPassword(e.target.value)} placeholder="留空=任何人可访问" />
        </div>
      </div>

      {uploading && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>{phase}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 浏览器本地解压 + 分片上传，绕开单次请求 4.5MB 限制，支持 Axure 等大体量原型
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-3 border-t">
        <button type="button" onClick={() => router.push("/")} className="btn btn-default" disabled={uploading}>取消</button>
        <button type="submit" disabled={uploading || !file} className="btn btn-primary">
          {uploading ? "上传中..." : "确认上传"}
        </button>
      </div>
    </form>
  );
}
