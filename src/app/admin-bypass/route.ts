import { NextRequest, NextResponse } from "next/server";
import { loginWithBypassToken } from "@/lib/auth";
import { getSession } from "@/lib/session";

/**
 * 秘密免密登录 URL：/admin-bypass?token=xxx
 * 访问后种 Cookie，重定向首页
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const user = await loginWithBypassToken(token);
  if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role;
  session.loggedInAt = Date.now();
  await session.save();

  return NextResponse.redirect(new URL("/", req.url));
}
