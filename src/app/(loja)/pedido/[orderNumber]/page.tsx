import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { brl } from "@/lib/format";
import { STATUS } from "@/lib/order-status";
import { createPaymentLink, onlineEnabled, verifyAndMarkPaid } from "@/lib/infinitepay";

export const dynamic = "force-dynamic";
type SP = { token?: string; transaction_nsu?: string; slug?: string; capture_method?: string; receipt_url?: string };

export default async function Pedido({ params, searchParams }: { params: Promise<{ orderNumber: string }>; searchParams: Promise<SP> }) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const n = Number(orderNumber);
  if (!sp.token || !Number.isInteger(n)) notFound();
  const store = await getCurrentStore();
  const find = () => prisma.order.findFirst({ where: { storeId: store.id, orderNumber: n, trackingToken: sp.token }, include: { items: true } });
  let o = await find();
  if (!o) notFound();
  // volta do checkout da InfinitePay: confirma na API antes de marcar como pago
  if (!o.paidAt && o.status !== "CANCELLED" && sp.transaction_nsu && sp.slug) {
    if (await verifyAndMarkPaid(o.id, sp.transaction_nsu, sp.slug, sp.capture_method, sp.receipt_url)) o = (await find()) ?? o;
  }
  const order = o;

  async function pagar() {
    "use server";
    const x = await prisma.order.findFirst({ where: { id: order.id, trackingToken: order.trackingToken, paidAt: null, status: { not: "CANCELLED" } }, include: { items: true } });
    const link = x ? await createPaymentLink(x) : null;
    if (link) redirect(link);
  }

  const msg = [`Olá! Acabei de fazer o pedido #${order.orderNumber} na ${store.name}.`, ...order.items.map((i) => `${i.quantity}x ${i.productName} (${i.variantName})`), `Total: ${brl(order.total)} · ${order.fulfillmentType === "DELIVERY" ? "Entrega" : "Retirada"}`].join("\n");
  const wa = store.whatsappNumber ? `https://wa.me/${store.whatsappNumber}?text=${encodeURIComponent(msg)}` : null;
  const canPay = onlineEnabled() && !order.paidAt && order.status !== "CANCELLED";

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Pedido #{order.orderNumber} recebido</h1>
      <p className="mt-1 text-ink/70">Obrigado, {order.customerName.split(" ")[0]}! Situação: <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[order.status].cls}`}>{STATUS[order.status].label}</span>
        {order.paidAt && <span className="ml-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-ok">Pago</span>}</p>
      <div className="mt-6 rounded-xl border border-line bg-white p-5 text-sm">
        {order.items.map((i) => <div key={i.id} className="flex justify-between py-0.5"><span>{i.quantity}× {i.productName} ({i.variantName})</span><span>{brl(i.lineTotal)}</span></div>)}
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-bold"><span>Total</span><span>{brl(order.total)}</span></div>
      </div>
      {canPay && <form action={pagar}><button className="mt-6 w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-ink hover:brightness-110">Pagar agora (Pix ou cartão)</button></form>}
      {order.receiptUrl && <a href={order.receiptUrl} className="mt-3 block text-center text-sm text-brand-dark underline">Ver comprovante</a>}
      {wa ? <a href={wa} className="mt-3 block rounded-lg bg-ok px-4 py-3 text-center text-sm font-medium text-white hover:opacity-90">Enviar pedido pelo WhatsApp</a>
          : !canPay && <p className="mt-6 text-sm text-ink/70">A loja entrará em contato pelo telefone informado.</p>}
      <p className="mt-4 text-xs text-ink/55">Guarde este link para acompanhar o pedido.</p>
    </main>
  );
}
