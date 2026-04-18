"use client";

type ProtoStat = {
  slug: string;
  name: string;
  totalPV: number;
  totalUV: number;
  last7Days: { date: string; pv: number; uv: number }[];
};

type Props = {
  totalPV: number;
  totalUV: number;
  globalLast7: { date: string; pv: number; uv: number }[];
  prototypeStats: ProtoStat[];
};

export function StatsDashboard({ totalPV, totalUV, globalLast7, prototypeStats }: Props) {
  return (
    <div className="space-y-5">
      {/* 顶部指标 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="总 PV (30天)" value={totalPV} color="text-primary" />
        <StatCard label="独立访客 UV" value={totalUV} color="text-green-600" />
        <StatCard label="原型总数" value={prototypeStats.length} />
        <StatCard label="近 7 天 PV" value={globalLast7.reduce((a, x) => a + x.pv, 0)} color="text-amber-600" />
      </div>

      {/* 近 7 天趋势图 */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">近 7 天访问趋势</h3>
        <TrendChart data={globalLast7} />
      </div>

      {/* 原型排行 */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold">原型访问排行</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 border-b">
              <th className="text-left px-4 py-3 font-medium w-12">#</th>
              <th className="text-left px-4 py-3 font-medium">原型</th>
              <th className="text-right px-4 py-3 font-medium w-24">PV</th>
              <th className="text-right px-4 py-3 font-medium w-24">UV</th>
              <th className="text-left px-4 py-3 font-medium w-64">近 7 天</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {prototypeStats.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-12">还没有访问数据</td></tr>
            )}
            {prototypeStats.map((p, i) => (
              <tr key={p.slug} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 font-mono">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-right font-mono">{p.totalPV}</td>
                <td className="px-4 py-3 text-right font-mono">{p.totalUV}</td>
                <td className="px-4 py-3"><MiniChart data={p.last7Days} /></td>
                <td className="px-4 py-3 text-right">
                  <a href={`/p/${p.slug}/`} target="_blank" className="text-primary hover:underline text-xs">预览</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs text-gray-500 mb-2">{label}</div>
      <div className={`text-3xl font-semibold ${color || "text-gray-900"}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function TrendChart({ data }: { data: { date: string; pv: number; uv: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.pv));
  return (
    <div className="flex items-end gap-4 h-40">
      {data.map((d, i) => {
        const pvHeight = (d.pv / max) * 100;
        const uvHeight = (d.uv / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex items-end gap-1 h-32">
              <div className="flex-1 bg-primary rounded-t transition-all hover:opacity-80" title={`PV ${d.pv}`}
                style={{ height: `${pvHeight}%`, minHeight: d.pv > 0 ? "4px" : "0" }} />
              <div className="flex-1 bg-green-500 rounded-t transition-all hover:opacity-80" title={`UV ${d.uv}`}
                style={{ height: `${uvHeight}%`, minHeight: d.uv > 0 ? "4px" : "0" }} />
            </div>
            <div className="text-xs text-gray-500">{d.date}</div>
          </div>
        );
      })}
      <div className="text-xs text-gray-500 ml-4 space-y-1">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-primary rounded"/> PV</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"/> UV</div>
      </div>
    </div>
  );
}

function MiniChart({ data }: { data: { date: string; pv: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.pv));
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((d, i) => (
        <div key={i} className="flex-1 bg-primary/60 rounded-sm" title={`${d.date}: ${d.pv}`}
          style={{ height: `${(d.pv / max) * 100}%`, minHeight: d.pv > 0 ? "2px" : "1px" }} />
      ))}
    </div>
  );
}
