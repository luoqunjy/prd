import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, requireSession } from "@/lib/session";
import { getPrototypeBySlug, savePrototype, deletePrototype, getUserById } from "@/lib/db";
import { deletePrefix } from "@/lib/storage";
import { uploadCustomCover } from "@/lib/thumbnail";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPrototypeBySlug(slug);
  if (!p) return NextResponse.json({ error: "不存在" }, { status: 404 });
  return NextResponse.json({ prototype: p });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requireSuperAdmin();
    const { slug } = await params;
    const p = await getPrototypeBySlug(slug);
    if (!p) return NextResponse.json({ error: "不存在" }, { status: 404 });

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const cover = form.get("cover") as File | null;
      if (cover) {
        const ext = cover.name.split(".").pop() || "png";
        const buf = Buffer.from(await cover.arrayBuffer());
        await uploadCustomCover(slug, buf, ext);
      }
    } else {
      const body = await req.json();
      const patch: any = {};
      if (typeof body.name === "string") patch.name = body.name.trim();
      if (typeof body.description === "string") patch.description = body.description.trim();
      if (typeof body.entryFile === "string") patch.entryFile = body.entryFile.trim();
      if ("accessPassword" in body) patch.accessPassword = body.accessPassword || null;
      if (typeof body.archived === "boolean") patch.archived = body.archived;
      await savePrototype({ ...p, ...patch, updatedAt: Date.now() });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (e.message === "FORBIDDEN") return NextResponse.json({ error: "仅管理员可编辑" }, { status: 403 });
    return NextResponse.json({ error: e.message || "失败" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireSession();
    const { slug } = await params;
    const p = await getPrototypeBySlug(slug);
    if (!p) return NextResponse.json({ error: "不存在" }, { status: 404 });
    const user = await getUserById(session.userId);
    const allowed = user && (user.role === "super_admin" || user.id === p.uploadedBy);
    if (!allowed) return NextResponse.json({ error: "无权限删除" }, { status: 403 });

    await deletePrefix(`prototypes/${slug}/`);
    await deletePrefix(`covers/${slug}.`);
    await deletePrototype(p.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json({ error: e.message || "失败" }, { status: 400 });
  }
}
