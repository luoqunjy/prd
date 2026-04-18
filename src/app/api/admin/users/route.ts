import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/session";
import { getUsers, getUserByPhone, saveUser } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function GET() {
  try {
    await requireSuperAdmin();
    const users = await getUsers();
    // 不返回 passwordHash
    return NextResponse.json({ users: users.map(({ passwordHash, ...u }) => u) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "失败" }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const { phone, name, password, visibleProjectIds = [], enabled = true } = body;

    if (!/^1\d{10}$/.test(phone)) return NextResponse.json({ error: "手机号格式错" }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: "姓名必填" }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });

    const existing = await getUserByPhone(phone);
    if (existing) return NextResponse.json({ error: "该手机号已存在" }, { status: 409 });

    const now = Date.now();
    const user: User = {
      id: "user_" + phone + "_" + now,
      phone, name: name.trim(),
      passwordHash: await hashPassword(password),
      role: "user",
      visibleProjectIds,
      enabled,
      createdAt: now, updatedAt: now,
    };
    await saveUser(user);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "失败" }, { status: 400 });
  }
}
