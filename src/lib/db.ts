/**
 * 元数据存储抽象
 * - 本地开发：JSON 文件 ./data/db.json
 * - 生产：Vercel KV（Upstash Redis）
 * 通过 KV_REST_API_URL 环境变量切换
 */

import fs from "fs/promises";
import path from "path";
import type { User, Prototype, StatEvent } from "./types";

// Vercel serverless 只允许 /tmp 写，本地开发用 ./data
const DB_PATH = process.env.VERCEL
  ? "/tmp/db.json"
  : path.join(process.cwd(), "data", "db.json");

type DBShape = {
  users: User[];
  prototypes: Prototype[];
  events: StatEvent[]; // 访问事件
};

async function ensureFile() {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  try { await fs.access(DB_PATH); }
  catch { await fs.writeFile(DB_PATH, JSON.stringify({ users: [], prototypes: [], events: [] }, null, 2)); }
}

async function loadLocal(): Promise<DBShape> {
  await ensureFile();
  const raw = await fs.readFile(DB_PATH, "utf8");
  const data = JSON.parse(raw);
  return { users: data.users || [], prototypes: data.prototypes || [], events: data.events || [] };
}

async function saveLocal(db: DBShape): Promise<void> {
  await ensureFile();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

const useKV = !!process.env.KV_REST_API_URL;

async function kvLoad(): Promise<DBShape> {
  const { kv } = await import("@vercel/kv");
  const [users, prototypes, events] = await Promise.all([
    kv.get<User[]>("users"),
    kv.get<Prototype[]>("prototypes"),
    kv.get<StatEvent[]>("events"),
  ]);
  return { users: users || [], prototypes: prototypes || [], events: events || [] };
}

async function kvSave(db: DBShape): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await Promise.all([
    kv.set("users", db.users),
    kv.set("prototypes", db.prototypes),
    kv.set("events", db.events),
  ]);
}

export async function loadDB(): Promise<DBShape> {
  return useKV ? await kvLoad() : await loadLocal();
}

export async function saveDB(db: DBShape): Promise<void> {
  return useKV ? await kvSave(db) : await saveLocal(db);
}

// ====== 便捷 API ======
export async function getUsers(): Promise<User[]> { return (await loadDB()).users; }
export async function getUserByPhone(phone: string): Promise<User | undefined> {
  return (await getUsers()).find(u => u.phone === phone);
}
export async function getUserById(id: string): Promise<User | undefined> {
  return (await getUsers()).find(u => u.id === id);
}
export async function saveUser(user: User): Promise<void> {
  const db = await loadDB();
  const idx = db.users.findIndex(u => u.id === user.id);
  if (idx >= 0) db.users[idx] = user;
  else db.users.push(user);
  await saveDB(db);
}
export async function deleteUser(id: string): Promise<void> {
  const db = await loadDB();
  db.users = db.users.filter(u => u.id !== id);
  await saveDB(db);
}

export async function getPrototypes(): Promise<Prototype[]> { return (await loadDB()).prototypes; }
export async function getPrototypeById(id: string): Promise<Prototype | undefined> {
  return (await getPrototypes()).find(p => p.id === id);
}
export async function getPrototypeBySlug(slug: string): Promise<Prototype | undefined> {
  return (await getPrototypes()).find(p => p.slug === slug);
}
export async function savePrototype(p: Prototype): Promise<void> {
  const db = await loadDB();
  const idx = db.prototypes.findIndex(x => x.id === p.id);
  if (idx >= 0) db.prototypes[idx] = p;
  else db.prototypes.push(p);
  await saveDB(db);
}
export async function deletePrototype(id: string): Promise<void> {
  const db = await loadDB();
  db.prototypes = db.prototypes.filter(p => p.id !== id);
  db.events = db.events.filter(e => e.prototypeId !== id);
  await saveDB(db);
}

export async function recordEvent(e: StatEvent): Promise<void> {
  const db = await loadDB();
  db.events.push(e);
  // 最多保留 30 天
  const cutoff = Date.now() - 30 * 86400_000;
  db.events = db.events.filter(x => x.timestamp > cutoff);
  await saveDB(db);
}

export async function getEvents(prototypeId: string): Promise<StatEvent[]> {
  return (await loadDB()).events.filter(e => e.prototypeId === prototypeId);
}
