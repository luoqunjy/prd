import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getPrototypeBySlug } from "@/lib/db";
import { getObject, guessMime } from "@/lib/storage";
import { recordEvent } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

function tryDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/**
 * 预览路由：/p/[slug]/[[...path]]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path?: string[] }> }
) {
  const { slug: rawSlug, path: rawSub } = await params;
  const slug = tryDecode(rawSlug);
  const subPath = (rawSub || []).map(tryDecode);

  console.log(`[preview] slug=${JSON.stringify(slug)} raw=${JSON.stringify(rawSlug)} sub=${JSON.stringify(subPath)}`);

  // 尝试两种 slug 形式
  let proto = await getPrototypeBySlug(slug);
  if (!proto && slug !== rawSlug) proto = await getPrototypeBySlug(rawSlug);
  if (!proto) {
    console.log(`[preview] 404 prototype: tried ${slug} and ${rawSlug}`);
    return new NextResponse(`原型不存在: ${slug}`, { status: 404 });
  }

  // 密码校验
  if (proto.accessPassword) {
    const unlockCookie = req.cookies.get(`proto_unlock_${proto.slug}`)?.value;
    if (unlockCookie !== proto.accessPassword) {
      const session = await getSession();
      const isOwner = session.userId && (session.role === "super_admin" || session.userId === proto.uploadedBy);
      if (!isOwner) {
        return NextResponse.redirect(new URL(`/?locked=${encodeURIComponent(proto.slug)}`, req.url));
      }
    }
  }

  // 解析目标文件路径
  let target = subPath.length > 0 ? subPath.join("/") : "";
  if (!target || target.endsWith("/")) {
    target = target + proto.entryFile.split("/").pop()!;
  }

  // 路径清洗
  const safeRel = target.split("/").filter(s => s && s !== "..").join("/");
  if (!safeRel) {
    return NextResponse.redirect(new URL(`/p/${proto.slug}/${proto.entryFile}`, req.url));
  }

  // 构建存储 key，用 proto.slug（DB 中真实存的值，可能带中文）
  const key = `prototypes/${proto.slug}/${safeRel}`;
  console.log(`[preview] reading key=${JSON.stringify(key)}`);
  let obj = await getObject(key);

  if (!obj) {
    // 兜底 1：如果访问的是根，尝试 entryFile 完整路径（当 entryFile 在子目录）
    if (safeRel === proto.entryFile.split("/").pop()) {
      const entryKey = `prototypes/${proto.slug}/${proto.entryFile}`;
      console.log(`[preview] fallback to entry ${entryKey}`);
      obj = await getObject(entryKey);
    }
  }

  if (!obj) {
    console.log(`[preview] 404 file: ${safeRel}`);
    return new NextResponse(`文件未找到: ${safeRel}`, { status: 404 });
  }

  const ext = path.extname(safeRel);
  const contentType = obj.contentType || guessMime(ext);

  if (/\.html?$/i.test(safeRel)) {
    recordVisitAsync(proto.id, req);
  }

  return new NextResponse(new Uint8Array(obj.body), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

async function recordVisitAsync(prototypeId: string, req: NextRequest) {
  try {
    const visitorId = req.cookies.get("visitor_id")?.value
      || `anon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await recordEvent({
      prototypeId,
      timestamp: Date.now(),
      visitorId,
      userAgent: req.headers.get("user-agent") || undefined,
    });
  } catch {}
}
