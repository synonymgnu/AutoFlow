import { prisma } from "./prisma";

const API = "https://api.checkout.infinitepay.io";
const handle = () => process.env.INFINITEPAY_HANDLE?.replace(/^\$/, "");
const base = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const cents = (v: unknown) => Math.round(Number(v) * 100);
export const onlineEnabled = () => Boolean(handle());

type OrderForLink = {
  id: string; orderNumber: number; trackingToken: string; customerName: string; customerPhone: string; deliveryFee: unknown;
  items: { quantity: number; unitPrice: unknown; productName: string; variantName: string }[];
};

// Cria o link de pagamento (Pix/cartão) no checkout hospedado da InfinitePay. Valores sempre em centavos, vindos do banco.
export async function createPaymentLink(o: OrderForLink, email?: string | null): Promise<string | null> {
  const h = handle();
  if (!h) return null;
  const items = o.items.map((i) => ({ quantity: i.quantity, price: cents(i.unitPrice), description: `${i.productName} (${i.variantName})`.slice(0, 100) }));
  if (cents(o.deliveryFee) > 0) items.push({ quantity: 1, price: cents(o.deliveryFee), description: "Frete" });
  const phone = o.customerPhone.replace(/\D/g, "").replace(/^55/, "");
  try {
    const res = await fetch(`${API}/links`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        handle: h, order_nsu: o.id, items,
        redirect_url: `${base()}/pagamento/retorno`, // a InfinitePay acrescenta order_nsu, slug, transaction_nsu etc.
        webhook_url: `${base()}/api/webhooks/infinitepay`,
        customer: { name: o.customerName, ...(email ? { email } : {}), phone_number: `+55${phone}` },
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || typeof j.url !== "string") console.error("[infinitepay] link falhou", res.status, j);
    return res.ok && typeof j.url === "string" ? j.url : null;
  } catch (e) {
    console.error("[infinitepay] erro de rede", e);
    return null;
  }
}

// O webhook e o retorno do navegador NÃO provam pagamento sozinhos: confirmamos na API (payment_check)
// e exigimos que o valor pago seja o total do pedido. Idempotente (paidAt só é gravado uma vez).
export async function verifyAndMarkPaid(orderId: string, transactionNsu: string, slug: string, method?: string, receipt?: string): Promise<boolean> {
  const h = handle();
  if (!h) return false;
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o || o.status === "CANCELLED") return false;
  if (o.paidAt) return true;
  const res = await fetch(`${API}/payment_check`, {
    method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ handle: h, order_nsu: orderId, transaction_nsu: transactionNsu, slug }),
  }).catch(() => null);
  const j = res && res.ok ? await res.json().catch(() => null) : null;
  if (!j?.paid || Number(j.amount) !== cents(o.total)) return false;
  try {
    await prisma.order.updateMany({
      where: { id: orderId, paidAt: null },
      data: { paidAt: new Date(), paymentMethod: String(method ?? j.capture_method ?? "") || null, transactionNsu, receiptUrl: receipt?.startsWith("https://") ? receipt : null },
    });
    await prisma.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CONFIRMED" } });
  } catch { /* transaction_nsu repetido: já processado */ }
  return true;
}
