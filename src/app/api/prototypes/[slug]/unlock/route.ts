import { NextRequest, NextResponse } from "next/server";
import { getPrototypeBySlug } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { password } = await req.json();
  const proto = await getPrototypeBySlug(slug);
  if (!proto) return NextResponse.json({ error: "原型不存在" }, { status: 404 });
  if (!proto.accessPassword) return NextResponse.json({ ok: true });
  if (password !== proto.accessPassword) return NextResponse.json({ error: "密码错误" }, { status: 403 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`proto_unlock_${slug}`, proto.accessPassword, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 2 * 60 * 60, // 2 小时
    path: "/",
  });
  return res;
}
