import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getPrototypeBySlug, savePrototype, getUserById } from "@/lib/db";
import { extractZipToStorage, } from "@/lib/zip";
import { generateThumbnailLater } from "@/lib/thumbnail";
import type { Prototype } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const user = await getUserById(session.userId);
    if (!user || !user.enabled) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const slug = String(form.get("slug") || "").trim();
    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();
    const entryFile = String(form.get("entryFile") || "index.html").trim();
    const accessPassword = String(form.get("accessPassword") || "").trim() || null;

    if (!file) return NextResponse.json({ error: "未上传文件" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "名称必填" }, { status: 400 });
    if (!/^[a-z0-9\u4e00-\u9fa5-]+$/i.test(slug)) return NextResponse.json({ error: "Slug 格式非法" }, { status: 400 });

    const existing = await getPrototypeBySlug(slug);
    if (existing) return NextResponse.json({ error: `Slug "${slug}" 已被占用，请换一个` }, { status: 409 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { entryFile: actualEntry, fileCount, sizeBytes } = await extractZipToStorage(buffer, slug, entryFile);

    const now = Date.now();
    const p: Prototype = {
      id: "proto_" + slug + "_" + now,
      slug,
      name,
      description,
      coverUrl: null,
      coverCustom: false,
      accessPassword,
      entryFile: actualEntry,
      sizeBytes,
      fileCount,
      uploadedBy: user.id,
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    await savePrototype(p);

    // 异步触发截图（非阻塞）
    generateThumbnailLater(slug).catch(() => {});

    return NextResponse.json({ ok: true, prototype: p });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json({ error: e.message || "上传失败" }, { status: 400 });
  }
}
