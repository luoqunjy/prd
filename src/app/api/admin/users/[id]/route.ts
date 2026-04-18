import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/session";
import { getUserById, saveUser, deleteUser } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    const body = await req.json();
    const patch: any = { updatedAt: Date.now() };

    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.enabled === "boolean") {
      if (user.role === "super_admin" && !body.enabled)
        return NextResponse.json({ error: "不可停用超级管理员" }, { status: 400 });
      patch.enabled = body.enabled;
    }
    if (Array.isArray(body.visibleProjectIds)) patch.visibleProjectIds = body.visibleProjectIds;
    if (typeof body.password === "string" && body.password.length >= 6) {
      patch.passwordHash = await hashPassword(body.password);
    }

    await saveUser({ ...user, ...patch });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "失败" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) return NextResponse.json({ error: "不存在" }, { status: 404 });
    if (user.role === "super_admin") return NextResponse.json({ error: "不可删除超级管理员" }, { status: 400 });
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "失败" }, { status: 400 });
  }
}
