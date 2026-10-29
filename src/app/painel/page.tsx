import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";
import { brl } from "@/lib/format";
import { OPEN, STATUS } from "@/lib/order-status";

export const dynamic = "force-dynamic";
const DAY = 86400000, TZ = "America/Sao_Paulo";
const day = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TZ });
const PERIODS = { hoje: ["Hoje", 1], "7d": ["7 dias", 7], "30d": ["30 dias", 30], "12m": ["12 meses", 365] } as const;
type P = keyof typeof PERIODS;
type O = { createdAt: Date; total: unknown; status: string; paidAt: Date | null; fulfillmentType: string };

export default async function Resumo({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { store, role } = await requireStoreRole();
  const sp = (await searchParams).periodo;
  const periodo: P = sp && sp in PERIODS ? (sp as P) : "30d";
  const n = PERIODS[periodo][1];
  const today = new Date(`${day(new Date())}T00:00:00-03:00`);
  const start = new Date(today.getTime() - (n - 1) * DAY);
  const prevStart = new Date(start.getTime() - n * DAY);

  const [orders, newCustomers, open, top, low] = await Promise.all([
    prisma.order.findMany({ where: { storeId: store.id, createdAt: { gte: prevStart } }, select: { createdAt: true, total: true, status: true, paidAt: true, fulfillmentType: true }, take: 20000 }),
    prisma.customer.count({ where: { storeId: store.id, createdAt: { gte: start } } }),
    prisma.order.count({ where: { storeId: store.id, status: { in: OPEN } } }),
    prisma.orderItem.groupBy({
      by: ["productName"], where: { order: { storeId: store.id, status: { not: "CANCELLED" }, createdAt: { gte: start } } },
      _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { lineTotal: "desc" } }, take: 5,
    }),
    role === "OWNER"
      ? prisma.productVariant.findMany({ where: { product: { storeId: store.id }, isActive: true, stock: { lte: 5 } }, include: { product: true }, orderBy: { stock: "asc" }, take: 8 })
      : Promise.resolve([]),
  ]);

  const cur: O[] = orders.filter((o) => o.createdAt >= start), prev: O[] = orders.filter((o) => o.createdAt < start);
  const live = (a: O[]) => a.filter((o) => o.status !== "CANCELLED");
  const sum = (a: O[]) => a.reduce((s, o) => s + Number(o.total), 0);
  const c = live(cur), pv = live(prev);
  const rev = sum(c), prevRev = sum(pv), received = sum(c.filter((o) => o.paidAt));
  const cancelled = cur.length - c.length;
  const dl = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);

  const kpis = [
    { label: "Faturamento", value: brl(rev), d: dl(rev, prevRev) },
    { label: "Pedidos", value: String(c.length), d: dl(c.length, pv.length) },
    { label: "Ticket médio", value: brl(c.length ? rev / c.length : 0), d: dl(c.length ? rev / c.length : 0, pv.length ? prevRev / pv.length : 0) },
    { label: "Recebido", value: brl(received), note: `${brl(rev - received)} a receber` },
    { label: "Em andamento agora", value: String(open), href: "/painel/pedidos" },
    { label: "Clientes novos", value: String(newCustomers) },
    { label: "Cancelados", value: String(cancelled), note: cur.length ? `${Math.round((cancelled / cur.length) * 100)}% dos pedidos` : undefined },
    { label: "Entrega × retirada", value: `${c.filter((o) => o.fulfillmentType === "DELIVERY").length} × ${c.filter((o) => o.fulfillmentType === "PICKUP").length}` },
  ];

  const keyOf = (d: Date) => (periodo === "12m" ? day(d).slice(0, 7) : day(d));
  const keys = periodo === "12m"
    ? Array.from({ length: 12 }, (_, i) => { const d = new Date(today); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - (11 - i)); return day(d).slice(0, 7); })
    : Array.from({ length: n }, (_, i) => day(new Date(start.getTime() + i * DAY)));
  const series = keys.map((k) => ({ k, v: 0 }));
  for (const o of c) { const s = series.find((x) => x.k === keyOf(o.createdAt)); if (s) s.v += Number(o.total); }
  const max = Math.max(...series.map((s) => s.v), 1), topMax = Math.max(...top.map((t) => Number(t._sum.lineTotal ?? 0)), 1);
  const byStatus = Object.entries(STATUS).map(([k, v]) => ({ ...v, k, n: cur.filter((o) => o.status === k).length })).filter((x) => x.n > 0);
  const card = "rounded-xl border border-line bg-white";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Resumo</h1>
        <Link href="/painel/pedidos/novo" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-ink hover:brightness-110">Novo pedido</Link>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {(Object.keys(PERIODS) as P[]).map((k) => (
          <Link key={k} href={`/painel?periodo=${k}`} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${k === periodo ? "bg-ink text-white" : "border border-line bg-white"}`}>{PERIODS[k][0]}</Link>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${card} border-t-4 border-t-brand p-3 sm:p-4`}>
            <p className="text-xs text-ink/60 sm:text-sm">{k.label}</p>
            <p className="mt-1 text-lg font-bold tracking-tight sm:text-2xl">{k.value}</p>
            {k.d != null && <p className={`mt-1 text-xs ${k.d >= 0 ? "text-ok" : "text-red-700"}`}>{k.d >= 0 ? "▲" : "▼"} {Math.abs(k.d).toFixed(0)}% vs. período anterior</p>}
            {k.note && <p className="mt-1 text-xs text-ink/55">{k.note}</p>}
            {k.href && <Link href={k.href} className="mt-1 inline-block text-xs text-brand-dark underline">ver pedidos</Link>}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {periodo !== "hoje" && (
          <section className={`${card} p-4 lg:col-span-2`}>
            <h2 className="font-semibold">Faturamento {periodo === "12m" ? "por mês" : "por dia"}</h2>
            <div className="mt-4 flex h-44 items-end gap-1">
              {series.map((s, i) => (
                <div key={s.k} title={`${s.k}: ${brl(s.v)}`} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <div className="w-full rounded-t bg-brand/75 group-hover:bg-brand" style={{ height: `${Math.max((s.v / max) * 88, s.v > 0 ? 4 : 1)}%` }} />
                  <span className="h-3 text-[10px] text-ink/50">{series.length <= 14 || i % 5 === 0 ? (periodo === "12m" ? s.k.slice(5) : s.k.slice(8)) : ""}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className={`${card} p-4 ${periodo === "hoje" ? "lg:col-span-3" : ""}`}>
          <h2 className="font-semibold">Pedidos por situação</h2>
          {byStatus.length === 0 ? <p className="mt-3 text-sm text-ink/60">Sem pedidos no período.</p> : (
            <ul className="mt-3 flex flex-wrap gap-2">{byStatus.map((s) => <li key={s.k} className={`rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}: {s.n}</li>)}</ul>
          )}
        </section>
        <section className={`${card} p-4 lg:col-span-3`}>
          <h2 className="font-semibold">Mais vendidos</h2>
          {top.length === 0 ? <p className="mt-3 text-sm text-ink/60">Ainda sem vendas no período.</p> : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {top.map((t) => (
                <li key={t.productName} className="text-sm">
                  <div className="flex justify-between gap-2"><span className="truncate">{t.productName}</span><span className="text-ink/60">{t._sum.quantity} un. · {brl(t._sum.lineTotal)}</span></div>
                  <div className="mt-1 h-1.5 rounded bg-paper"><div className="h-1.5 rounded bg-brand" style={{ width: `${(Number(t._sum.lineTotal) / topMax) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {role === "OWNER" && (
        <section className={`${card} mt-5`}>
          <h2 className="border-b border-line px-4 py-3 font-semibold">Para repor <span className="text-sm font-normal text-ink/55">(só você vê o estoque)</span></h2>
          {low.length === 0 ? <p className="p-4 text-sm text-ink/60">Nenhum item com estoque baixo.</p> : (
            <ul className="divide-y divide-line">
              {low.map((v) => (
                <li key={v.id} className="flex justify-between px-4 py-3 text-sm">
                  <span>{v.product.name} <span className="text-ink/55">({v.name})</span></span>
                  <span className={v.stock === 0 ? "font-semibold text-red-700" : "text-warn"}>{v.stock === 0 ? "Esgotado" : `${v.stock} un.`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
