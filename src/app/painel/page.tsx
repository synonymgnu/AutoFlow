import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";
import { brl } from "@/lib/format";
import { OPEN } from "@/lib/order-status";

export const dynamic = "force-dynamic";
const DAY = 86400000;
const day = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export default async function Resumo() {
  const { store, role } = await requireStoreRole();
  const now = Date.now();
  const d30 = new Date(now - 30 * DAY), d60 = new Date(now - 60 * DAY), d14 = new Date(now - 14 * DAY);
  const valid = { storeId: store.id, status: { not: "CANCELLED" as const } };

  const [cur, prev, open, recent, top, low] = await Promise.all([
    prisma.order.aggregate({ where: { ...valid, createdAt: { gte: d30 } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { ...valid, createdAt: { gte: d60, lt: d30 } }, _sum: { total: true } }),
    prisma.order.count({ where: { storeId: store.id, status: { in: OPEN } } }),
    prisma.order.findMany({ where: { ...valid, createdAt: { gte: d14 } }, select: { createdAt: true, total: true } }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: { ...valid, createdAt: { gte: d30 } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
    // estoque é assunto do dono: nem é consultado para os demais papéis
    role === "OWNER"
      ? prisma.productVariant.findMany({
          where: { product: { storeId: store.id }, isActive: true, stock: { lte: 5 } },
          include: { product: true }, orderBy: { stock: "asc" }, take: 8,
        })
      : Promise.resolve([]),
  ]);

  const rev = Number(cur._sum.total ?? 0), prevRev = Number(prev._sum.total ?? 0);
  const delta = prevRev > 0 ? ((rev - prevRev) / prevRev) * 100 : null;
  const series = Array.from({ length: 14 }, (_, i) => ({ k: day(new Date(now - (13 - i) * DAY)), v: 0 }));
  for (const o of recent) { const s = series.find((x) => x.k === day(o.createdAt)); if (s) s.v += Number(o.total); }
  const max = Math.max(...series.map((s) => s.v), 1);
  const topMax = Math.max(...top.map((t) => Number(t._sum.lineTotal ?? 0)), 1);

  const kpis = [
    { label: "Faturamento (30 dias)", value: brl(rev), note: delta === null ? "sem período anterior" : `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs. 30 dias antes`, up: delta !== null && delta >= 0 },
    { label: "Pedidos (30 dias)", value: String(cur._count) },
    { label: "Ticket médio", value: brl(cur._count ? rev / cur._count : 0) },
    { label: "Pedidos em andamento", value: String(open), href: "/painel/pedidos" },
  ];
  const card = "rounded-xl border border-line bg-white";
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Resumo</h1>
        <Link href="/painel/pedidos/novo" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-ink hover:brightness-110">Novo pedido</Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${card} border-t-4 border-t-brand p-4`}>
            <p className="text-sm text-ink/60">{k.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{k.value}</p>
            {k.note && <p className={`mt-1 text-xs ${k.up ? "text-ok" : "text-ink/55"}`}>{k.note}</p>}
            {k.href && <Link href={k.href} className="mt-1 inline-block text-xs text-brand-dark underline">ver pedidos</Link>}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className={`${card} p-4 lg:col-span-2`}>
          <h2 className="font-semibold">Vendas por dia <span className="text-sm font-normal text-ink/55">(últimos 14 dias)</span></h2>
          <div className="mt-4 flex h-44 items-end gap-1.5">
            {series.map((s) => (
              <div key={s.k} title={`${s.k}: ${brl(s.v)}`} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t bg-brand/75 group-hover:bg-brand" style={{ height: `${Math.max((s.v / max) * 88, s.v > 0 ? 4 : 1)}%` }} />
                <span className="text-[10px] text-ink/50">{s.k.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className={`${card} p-4`}>
          <h2 className="font-semibold">Mais vendidos <span className="text-sm font-normal text-ink/55">(30 dias)</span></h2>
          {top.length === 0 ? <p className="mt-4 text-sm text-ink/60">Ainda sem vendas no período.</p> : (
            <ul className="mt-4 space-y-3">
              {top.map((t) => (
                <li key={t.productName} className="text-sm">
                  <div className="flex justify-between gap-2"><span className="truncate">{t.productName}</span><span className="text-ink/60">{t._sum.quantity} un.</span></div>
                  <div className="mt-1 h-1.5 rounded bg-paper"><div className="h-1.5 rounded bg-brand" style={{ width: `${(Number(t._sum.lineTotal) / topMax) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {role === "OWNER" && (
        <section className={`${card} mt-6`}>
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
