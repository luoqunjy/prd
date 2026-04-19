import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserById, getPrototypes, loadDB } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { StatsDashboard } from "@/components/StatsDashboard";
import { PageHero } from "@/components/PageHero";

export default async function StatsPage() {
  const s = await getSession();
  if (!s.userId) redirect("/login");
  const user = await getUserById(s.userId);
  if (!user || user.role !== "super_admin") redirect("/");

  const prototypes = await getPrototypes();
  const db = await loadDB();
  const events = db.events;

  // 按原型聚合
  const statsByProto = prototypes.map(p => {
    const protoEvents = events.filter(e => e.prototypeId === p.id);
    const visitors = new Set(protoEvents.map(e => e.visitorId));
    const last7 = last7DaysStats(protoEvents);
    return {
      slug: p.slug,
      name: p.name,
      totalPV: protoEvents.length,
      totalUV: visitors.size,
      last7Days: last7,
    };
  }).sort((a, b) => b.totalPV - a.totalPV);

  // 全局聚合
  const totalPV = events.length;
  const totalUV = new Set(events.map(e => e.visitorId)).size;
  const globalLast7 = last7DaysStats(events);

  return (
    <>
      <TopNav userName={user.name} role={user.role} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <PageHero
          title="访问统计"
          subtitle={`近 30 天：${totalPV} 次访问 · ${totalUV} 个独立访客 · ${prototypes.length} 个原型`}
          tip="看看哪些原型最受欢迎呀~"
          luluSize={80}
          gradient="blue"
        />
        <StatsDashboard
          totalPV={totalPV}
          totalUV={totalUV}
          globalLast7={globalLast7}
          prototypeStats={statsByProto}
        />
      </main>
    </>
  );
}

function last7DaysStats(events: any[]) {
  const today = new Date();
  const buckets: { date: string; pv: number; uv: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const start = d.getTime();
    const end = start + 86400000;
    const dayEvents = events.filter(e => e.timestamp >= start && e.timestamp < end);
    const uv = new Set(dayEvents.map(e => e.visitorId)).size;
    buckets.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      pv: dayEvents.length,
      uv,
    });
  }
  return buckets;
}
