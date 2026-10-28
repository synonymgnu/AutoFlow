import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { brl } from "@/lib/format";
import { STATUS } from "@/lib/order-status";

export const dynamic = "force-dynamic";

export default async function Pedido({ params, searchParams }: { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ token?: string }> }) {
  const { orderNumber } = await params;
  const { token } = await searchParams;
  const n = Number(orderNumber);
  if (!token || !Number.isInteger(n)) notFound();
  const store = await getCurrentStore();
  const o = await prisma.order.findFirst({ where: { storeId: store.id, orderNumber: n, trackingToken: token }, include: { items: true } });
  if (!o) notFound();

  const msg = [
    `Olá! Acabei de fazer o pedido #${o.orderNumber} na ${store.name}.`,
    ...o.items.map((i) => `${i.quantity}x ${i.productName} (${i.variantName})`),
    `Total: ${brl(o.total)} · ${o.fulfillmentType === "DELIVERY" ? "Entrega" : "Retirada"}`,
  ].join("\n");
  const wa = store.whatsappNumber ? `https://wa.me/${store.whatsappNumber}?text=${encodeURIComponent(msg)}` : null;

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Pedido #{o.orderNumber} recebido</h1>
      <p className="mt-1 text-ink/70">Obrigado, {o.customerName.split(" ")[0]}! Situação: <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span></p>
      <div className="mt-6 rounded-xl border border-line bg-white p-5 text-sm">
        {o.items.map((i) => <div key={i.id} className="flex justify-between py-0.5"><span>{i.quantity}× {i.productName} ({i.variantName})</span><span>{brl(i.lineTotal)}</span></div>)}
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-bold"><span>Total</span><span>{brl(o.total)}</span></div>
      </div>
      {wa ? (
        <a href={wa} className="mt-6 block rounded-lg bg-ok px-4 py-3 text-center text-sm font-medium text-white hover:opacity-90">Enviar pedido pelo WhatsApp</a>
      ) : <p className="mt-6 text-sm text-ink/70">A loja entrará em contato pelo telefone informado.</p>}
      <p className="mt-4 text-xs text-ink/55">Guarde este link para acompanhar o pedido.</p>
    </main>
  );
}
