import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById, getPrototypeBySlug, getEvents } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { PrototypeEditor } from "@/components/PrototypeEditor";
import { PageHero } from "@/components/PageHero";

export default async function AdminPrototypePage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await getSession();
  if (!s.userId) redirect("/login");
  const user = await getUserById(s.userId);
  if (!user || user.role !== "super_admin") redirect("/");

  const { slug } = await params;
  const proto = await getPrototypeBySlug(slug);
  if (!proto) notFound();

  const events = await getEvents(proto.id);
  const uploader = proto.uploadedBy ? await getUserById(proto.uploadedBy) : null;

  return (
    <>
      <TopNav userName={user.name} role={user.role} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-3 text-sm text-gray-500">
          <a href="/" className="hover:text-primary">← 返回列表</a>
        </div>
        <PageHero
          title={proto.name}
          subtitle={`Slug: /p/${proto.slug}/ · 上传人：${uploader?.name || "—"}`}
          tip="改封面、加密码、改入口文件都在这~"
          luluSize={80}
          gradient="green"
          actions={<a href={`/p/${proto.slug}/`} target="_blank" className="btn btn-default shadow-sm">🔗 打开预览</a>}
        />
        <PrototypeEditor proto={proto} eventCount={events.length} />
      </main>
    </>
  );
}
