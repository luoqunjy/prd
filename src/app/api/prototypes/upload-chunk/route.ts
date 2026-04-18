import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { requireSession } from "@/lib/session";
import { putObject, guessMime } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * 客户端逐文件上传接口。
 * 前端 JSZip 解压后，每个文件以 multipart/form-data 发过来。
 * 单次请求小，绕开 Vercel 4.5MB 整包限制。
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const form = await req.formData();
    const slug = String(form.get("slug") || "").trim();
    const relativePath = String(form.get("path") || "").trim();
    const file = form.get("file") as File | null;

    if (!slug || !relativePath || !file) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }
    if (!/^[a-z0-9-]+$/i.test(slug)) {
      return NextResponse.json({ error: "slug 非法" }, { status: 400 });
    }
    // 防路径穿透
    if (relativePath.includes("..") || relativePath.startsWith("/")) {
      return NextResponse.json({ error: "path 非法" }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: `单个文件过大（${(file.size/1024/1024).toFixed(1)}MB > 4MB）` }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(relativePath);
    const key = `prototypes/${slug}/${relativePath}`;
    await putObject(key, buf, guessMime(ext));

    return NextResponse.json({ ok: true, size: buf.length });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json({ error: e.message || "失败" }, { status: 500 });
  }
}
