import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";
import { brl } from "@/lib/format";
import { STATUS } from "@/lib/order-status";
import { ConfirmButton } from "@/components/painel/confirm-button";
import { excluirPedido, mudarStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { store, role } = await requireStoreRole();
  const { status } = await searchParams;
  const filtro = status && status in STATUS ? (status as OrderStatus) : undefined;
  const orders = await prisma.order.findMany({
    where: { storeId: store.id, ...(filtro ? { status: filtro } : {}) },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const tab = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm ${active ? "bg-ink text-white" : "border border-line bg-white text-ink/70 hover:bg-paper"}`;
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
        <Link href="/painel/pedidos/novo" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-ink hover:brightness-110">Novo pedido</Link>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/painel/pedidos" className={tab(!filtro)}>Todos</Link>
        {(Object.keys(STATUS) as OrderStatus[]).map((s) => (
          <Link key={s} href={`/painel/pedidos?status=${s}`} className={tab(filtro === s)}>{STATUS[s].label}</Link>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-line bg-paper/60 text-ink/60">
            <tr><th className="px-4 py-3 font-medium">Pedido</th><th className="px-4 py-3 font-medium">Cliente</th><th className="px-4 py-3 font-medium">Itens</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Situação</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-ink/60">Nenhum pedido encontrado.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id} className="align-top">
                <td className="px-4 py-3"><p className="font-semibold">#{o.orderNumber}</p><p className="text-ink/55">{o.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</p></td>
                <td className="px-4 py-3"><p>{o.customerName}</p><p className="text-ink/55">{o.customerPhone} · {o.fulfillmentType === "DELIVERY" ? "Entrega" : "Retirada"}</p>{o.notes && <p className="mt-1 whitespace-pre-line text-ink/70">{o.notes}</p>}</td>
                <td className="px-4 py-3 text-ink/80">{o.items.map((i) => <p key={i.id}>{i.quantity}× {i.productName} ({i.variantName})</p>)}</td>
                <td className="px-4 py-3 font-semibold">{brl(o.total)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>{o.paidAt && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-ok">Pago</span>}
                  {o.status !== "CANCELLED" && (
                    <form action={mudarStatus} className="mt-2 flex gap-1">
                      <input type="hidden" name="id" value={o.id} />
                      <select name="status" defaultValue={o.status} className="rounded-lg border border-line bg-white px-2 py-1 text-xs">
                        {(Object.keys(STATUS) as OrderStatus[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                      </select>
                      <button className="rounded-lg border border-line px-2 py-1 text-xs hover:bg-paper">OK</button>
                    </form>
                  )}
                  {role === "OWNER" && (
                    <form action={excluirPedido} className="mt-2">
                      <input type="hidden" name="id" value={o.id} />
                      <ConfirmButton message={`Excluir o pedido #${o.orderNumber} definitivamente? Isso apaga o pedido do histórico e dos relatórios.`} className="text-xs text-red-700 underline">excluir pedido</ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
