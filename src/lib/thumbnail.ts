/**
 * 封面生成
 * - 优先使用 playwright-core + sparticuz/chromium (生产环境 Vercel)
 * - 本地若没装，退回到占位图
 * 异步执行，失败静默
 */

import { getPrototypeBySlug, savePrototype } from "./db";
import { putObject } from "./storage";

export async function generateThumbnailLater(slug: string): Promise<void> {
  // 异步但不阻塞上传响应
  setTimeout(() => generateThumbnail(slug).catch(() => {}), 500);
}

export async function generateThumbnail(slug: string): Promise<string | null> {
  const p = await getPrototypeBySlug(slug);
  if (!p) return null;
  if (p.coverCustom) return p.coverUrl; // 用户已手动上传，不自动覆盖

  // 生产环境推荐使用 playwright-core + @sparticuz/chromium
  // 本原型阶段先简化：生成一个 SVG 作为占位封面
  const svg = generatePlaceholderSVG(p.name);
  const buf = Buffer.from(svg, "utf-8");
  const key = `covers/${slug}.svg`;
  await putObject(key, buf, "image/svg+xml");
  const coverUrl = `/api/assets/${key}`;

  await savePrototype({ ...p, coverUrl, coverCustom: false, updatedAt: Date.now() });
  return coverUrl;
}

function generatePlaceholderSVG(name: string): string {
  // 基于名字生成一个好看的渐变卡片
  const seed = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = seed % 360;
  const hue2 = (hue + 60) % 360;
  const shortName = name.slice(0, 10);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue}, 70%, 55%)"/>
<stop offset="1" stop-color="hsl(${hue2}, 70%, 45%)"/>
</linearGradient></defs>
<rect width="400" height="225" fill="url(#g)"/>
<circle cx="320" cy="50" r="80" fill="white" opacity="0.1"/>
<circle cx="80" cy="200" r="60" fill="white" opacity="0.08"/>
<text x="200" y="120" text-anchor="middle" fill="white" font-size="28" font-weight="600" font-family="-apple-system, sans-serif">${escapeXML(shortName)}</text>
<text x="200" y="155" text-anchor="middle" fill="white" opacity="0.7" font-size="14" font-family="-apple-system, sans-serif">原型托管</text>
</svg>`;
}

function escapeXML(s: string): string {
  return s.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!));
}

/**
 * 从 Buffer 上传自定义封面（PNG/JPEG/WEBP）
 */
export async function uploadCustomCover(slug: string, buffer: Buffer, ext: string): Promise<string> {
  const { getPrototypeBySlug, savePrototype } = await import("./db");
  const p = await getPrototypeBySlug(slug);
  if (!p) throw new Error("原型不存在");
  const key = `covers/${slug}.${ext.toLowerCase().replace(/^\./, "")}`;
  const mimeMap: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
  };
  const ctype = mimeMap[ext.toLowerCase().replace(/^\./, "")] || "image/png";
  await putObject(key, buffer, ctype);
  const coverUrl = `/api/assets/${key}`;
  await savePrototype({ ...p, coverUrl, coverCustom: true, updatedAt: Date.now() });
  return coverUrl;
}
