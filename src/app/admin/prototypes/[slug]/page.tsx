import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById, getPrototypeBySlug, getEvents } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { PrototypeEditor } from "@/components/PrototypeEditor";

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 mb-1">
              <a href="/" className="hover:text-primary">← 返回列表</a>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">{proto.name}</h1>
            <p className="text-gray-500 text-sm mt-1">Slug: {proto.slug} · 上传人：{uploader?.name || "—"}</p>
          </div>
          <a href={`/p/${proto.slug}/`} target="_blank" className="btn btn-default">🔗 打开预览</a>
        </div>
        <PrototypeEditor proto={proto} eventCount={events.length} />
      </main>
    </>
  );
}
