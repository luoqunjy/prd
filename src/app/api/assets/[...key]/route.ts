import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getObject, guessMime } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * 通用静态资源读取（封面图等）
 * /api/assets/covers/xxx.svg → 从存储层读
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const fullKey = key.join("/");
  // 防穿透
  if (fullKey.includes("..")) return new NextResponse("bad path", { status: 400 });
  const obj = await getObject(fullKey);
  if (!obj) return new NextResponse("Not Found", { status: 404 });
  const ext = path.extname(fullKey);
  return new NextResponse(new Uint8Array(obj.body), {
    status: 200,
    headers: {
      "Content-Type": obj.contentType || guessMime(ext),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
