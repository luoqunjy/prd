/**
 * 文件存储抽象
 * - 本地：./data/storage/{slug}/...
 * - 生产：Cloudflare R2（S3 兼容）
 * 通过 R2_ACCOUNT_ID 环境变量切换
 */

import fs from "fs/promises";
import path from "path";

const LOCAL_ROOT = path.join(process.cwd(), "data", "storage");

const useR2 = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

// ========== R2 客户端 ==========
let r2Client: any = null;
async function getR2() {
  if (r2Client) return r2Client;
  const { S3Client } = await import("@aws-sdk/client-s3");
  r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return r2Client;
}

const BUCKET = process.env.R2_BUCKET || "prototype-host";

// ========== API ==========
export async function putObject(key: string, body: Buffer, contentType?: string): Promise<void> {
  if (useR2) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getR2();
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
  } else {
    const full = path.join(LOCAL_ROOT, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }
}

export async function getObject(key: string): Promise<{ body: Buffer; contentType: string | null } | null> {
  if (useR2) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getR2();
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      const chunks: Uint8Array[] = [];
      for await (const chunk of res.Body as any) chunks.push(chunk);
      return { body: Buffer.concat(chunks), contentType: res.ContentType || null };
    } catch (e: any) {
      if (e.name === "NoSuchKey") return null;
      throw e;
    }
  } else {
    const full = path.join(LOCAL_ROOT, key);
    try {
      const body = await fs.readFile(full);
      const ext = path.extname(full).toLowerCase();
      return { body, contentType: guessMime(ext) };
    } catch { return null; }
  }
}

export async function deletePrefix(prefix: string): Promise<void> {
  if (useR2) {
    const { ListObjectsV2Command, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
    const client = await getR2();
    let continuationToken: string | undefined;
    do {
      const listed = await client.send(new ListObjectsV2Command({
        Bucket: BUCKET, Prefix: prefix, ContinuationToken: continuationToken,
      }));
      if (listed.Contents && listed.Contents.length > 0) {
        await client.send(new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: listed.Contents.map((o: any) => ({ Key: o.Key })) },
        }));
      }
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);
  } else {
    const full = path.join(LOCAL_ROOT, prefix);
    try { await fs.rm(full, { recursive: true, force: true }); } catch {}
  }
}

export function storageMode() { return useR2 ? "r2" : "local"; }

// ========== MIME helper ==========
export function guessMime(ext: string): string {
  const map: Record<string, string> = {
    ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".ico": "image/x-icon", ".bmp": "image/bmp",
    ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
    ".mp4": "video/mp4", ".webm": "video/webm",
    ".mp3": "audio/mpeg", ".wav": "audio/wav",
    ".pdf": "application/pdf",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".map": "application/json",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}
