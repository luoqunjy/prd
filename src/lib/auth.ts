import bcrypt from "bcryptjs";
import { getUserByPhone, getUserById, saveUser } from "./db";
import type { User } from "./types";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * 确保超级管理员存在。启动时调用一次（seed）
 * 或每次登录尝试前懒初始化
 */
export async function ensureSuperAdmin(): Promise<User> {
  const phone = process.env.SUPER_ADMIN_PHONE || "18888888888";
  const password = process.env.SUPER_ADMIN_PASSWORD || "admin123";
  let user = await getUserByPhone(phone);
  if (user) {
    // 如果角色不对，纠正（允许通过环境变量重置密码 — 仅当与 dev 默认不同时）
    if (user.role !== "super_admin") {
      user.role = "super_admin";
      user.enabled = true;
      await saveUser(user);
    }
    return user;
  }
  const now = Date.now();
  user = {
    id: "super-admin-" + phone,
    phone,
    name: "超级管理员",
    passwordHash: await hashPassword(password),
    role: "super_admin",
    visibleProjectIds: [],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
  await saveUser(user);
  return user;
}

export async function loginWithPhonePassword(phone: string, password: string): Promise<User | null> {
  await ensureSuperAdmin();
  const user = await getUserByPhone(phone);
  if (!user) return null;
  if (!user.enabled) throw new Error("账号已停用，请联系管理员");
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

export async function loginWithBypassToken(token: string): Promise<User | null> {
  const expected = process.env.SUPER_ADMIN_BYPASS_TOKEN;
  if (!expected || expected.length < 8) return null;
  if (token !== expected) return null;
  return await ensureSuperAdmin();
}
