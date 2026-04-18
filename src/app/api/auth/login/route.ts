import { NextRequest, NextResponse } from "next/server";
import { loginWithPhonePassword } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();
    if (!phone || !password) return NextResponse.json({ error: "手机号和密码必填" }, { status: 400 });

    const user = await loginWithPhonePassword(String(phone), String(password));
    if (!user) return NextResponse.json({ error: "手机号或密码错误" }, { status: 401 });

    const session = await getSession();
    session.userId = user.id;
    session.role = user.role;
    session.loggedInAt = Date.now();
    await session.save();

    return NextResponse.json({ ok: true, user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "服务异常" }, { status: 400 });
  }
}
