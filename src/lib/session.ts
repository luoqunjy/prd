import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { Session } from "./types";

// iron-session 要求密码至少 32 字符；不足时自动 padding 兜底
function resolveSessionPassword(): string {
  const raw = process.env.SESSION_SECRET || "dev_session_secret_change_me_in_production_32ch";
  if (raw.length >= 32) return raw;
  // 不足 32 字符则循环扩展，避免运行时崩溃（生产环境应该填够 32 字符）
  const padded = (raw + "_padding_for_length_compliance").repeat(3);
  return padded.slice(0, Math.max(32, raw.length * 3));
}

const opts: SessionOptions = {
  password: resolveSessionPassword(),
  cookieName: "proto_host_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 天
    path: "/",
  },
};

export type SessionData = Partial<Session>;

export async function getSession() {
  const store = await cookies();
  return await getIronSession<SessionData>(store as any, opts);
}

export async function requireSession() {
  const s = await getSession();
  if (!s.userId) throw new Error("UNAUTHORIZED");
  return s as Session;
}

export async function requireSuperAdmin() {
  const s = await getSession();
  if (!s.userId || s.role !== "super_admin") throw new Error("FORBIDDEN");
  return s as Session;
}
