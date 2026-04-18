import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getPrototypeBySlug } from "@/lib/db";
import { getObject, guessMime } from "@/lib/storage";
import { recordEvent } from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

/**
 * 预览路由：/p/[slug]/[[...path]]
 * - 无 path 或以 / 结尾 → 加载入口文件
 * - 有 path → 加载对应文件
 * - 访问密码在 cookie 中验证
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path?: string[] }> }
) {
  const { slug, path: subPath } = await params;
  const proto = await getPrototypeBySlug(slug);
  if (!proto) return new NextResponse("原型不存在", { status: 404 });

  // 密码校验（仅首次访问入口需要，进入后 cookie 放行）
  if (proto.accessPassword) {
    const unlockCookie = req.cookies.get(`proto_unlock_${slug}`)?.value;
    if (unlockCookie !== proto.accessPassword) {
      // 管理员或上传者绕过密码（如果已登录）
      const session = await getSession();
      const isOwner = session.userId && (session.role === "super_admin" || session.userId === proto.uploadedBy);
      if (!isOwner) {
        return NextResponse.redirect(new URL(`/?locked=${slug}`, req.url));
      }
    }
  }

  // 解析要读的文件
  let target = subPath && subPath.length > 0 ? subPath.join("/") : "";
  if (!target || target.endsWith("/")) target = target + proto.entryFile.split("/").pop()!;
  // 解决 HTML 内部相对链接：entry 可能在子目录（如 "docs/index.html"），此时 target 是相对 /p/slug/ 根的
  // 默认 target 直接当作 prototype 根下的相对路径

  // 防路径穿透
  const safeRel = target.split("/").filter(s => s && s !== "..").join("/");
  if (!safeRel) return NextResponse.redirect(new URL(`/p/${slug}/${proto.entryFile}`, req.url));

  const key = `prototypes/${slug}/${safeRel}`;
  const obj = await getObject(key);
  if (!obj) {
    // 兜底：若访问 /p/slug/ 根 → 用 entryFile
    if (safeRel === proto.entryFile.split("/").pop()) {
      const entryKey = `prototypes/${slug}/${proto.entryFile}`;
      const entryObj = await getObject(entryKey);
      if (entryObj) {
        return serveObject(entryObj, proto.entryFile, req, slug);
      }
    }
    return new NextResponse("文件未找到: " + safeRel, { status: 404 });
  }

  return serveObject(obj, safeRel, req, slug);
}

function serveObject(obj: { body: Buffer; contentType: string | null }, relativePath: string, req: NextRequest, slug: string) {
  const ext = path.extname(relativePath);
  const contentType = obj.contentType || guessMime(ext);

  // HTML 响应异步记访问事件
  if (/\.html?$/i.test(relativePath)) {
    recordVisitAsync(slug, req);
  }

  return new NextResponse(new Uint8Array(obj.body), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

async function recordVisitAsync(slug: string, req: NextRequest) {
  try {
    const proto = await getPrototypeBySlug(slug);
    if (!proto) return;
    const visitorId = req.cookies.get("visitor_id")?.value || `anon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await recordEvent({
      prototypeId: proto.id,
      timestamp: Date.now(),
      visitorId,
      userAgent: req.headers.get("user-agent") || undefined,
    });
  } catch {}
}
