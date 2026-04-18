import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { Session } from "./types";

const opts: SessionOptions = {
  password: process.env.SESSION_SECRET || "dev_session_secret_change_me_in_production_32ch",
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
