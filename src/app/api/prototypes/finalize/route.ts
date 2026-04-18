import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { getUserById, getPrototypeBySlug, savePrototype } from "@/lib/db";
import { generateThumbnailLater } from "@/lib/thumbnail";
import type { Prototype } from "@/lib/types";

export const runtime = "nodejs";

/**
 * 所有 chunk 上传完成后，前端调这里创建元数据。
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const user = await getUserById(session.userId);
    if (!user || !user.enabled) return NextResponse.json({ error: "未授权" }, { status: 401 });

    const body = await req.json();
    const {
      slug, name, description = "",
      entryFile = "index.html",
      accessPassword = null,
      fileCount, sizeBytes,
    } = body;

    if (!name?.trim()) return NextResponse.json({ error: "名称必填" }, { status: 400 });
    if (!/^[a-z0-9-]+$/i.test(slug)) return NextResponse.json({ error: "slug 非法" }, { status: 400 });

    const existing = await getPrototypeBySlug(slug);
    if (existing) return NextResponse.json({ error: `Slug "${slug}" 已存在` }, { status: 409 });

    const now = Date.now();
    const p: Prototype = {
      id: "proto_" + slug + "_" + now,
      slug,
      name: String(name).trim(),
      description: String(description).trim(),
      coverUrl: null,
      coverCustom: false,
      accessPassword: accessPassword ? String(accessPassword) : null,
      entryFile: String(entryFile).trim() || "index.html",
      sizeBytes: Number(sizeBytes) || 0,
      fileCount: Number(fileCount) || 0,
      uploadedBy: user.id,
      createdAt: now,
      updatedAt: now,
      archived: false,
    };
    await savePrototype(p);
    generateThumbnailLater(slug).catch(() => {});

    return NextResponse.json({ ok: true, prototype: p });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json({ error: e.message || "失败" }, { status: 500 });
  }
}
