import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/session";
import { getPrototypeBySlug, savePrototype } from "@/lib/db";
import { generateThumbnail } from "@/lib/thumbnail";

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await requireSuperAdmin();
    const { slug } = await params;
    const p = await getPrototypeBySlug(slug);
    if (!p) return NextResponse.json({ error: "不存在" }, { status: 404 });
    // 强制重新生成，忽略 coverCustom 标志
    await savePrototype({ ...p, coverCustom: false });
    await generateThumbnail(slug);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "失败" }, { status: 400 });
  }
}
