import { prisma } from "@/lib/prisma";
import { verifyAndMarkPaid } from "@/lib/infinitepay";

export const runtime = "nodejs";

// Para onde a InfinitePay manda o cliente ao clicar em “Continuar”. Os parâmetros da URL não provam
// nada: o pagamento é confirmado na API (payment_check) antes de levar o cliente à página do pedido.
export async function GET(req: Request) {
  const u = new URL(req.url), q = u.searchParams;
  const origin = (process.env.APP_URL ?? u.origin).replace(/\/$/, "");
  const id = q.get("order_nsu"), tx = q.get("transaction_nsu"), slug = q.get("slug");
  let to = "/";
  if (id && tx && slug && (await verifyAndMarkPaid(id, tx, slug, q.get("capture_method") ?? undefined, q.get("receipt_url") ?? undefined))) {
    const o = await prisma.order.findUnique({ where: { id }, select: { orderNumber: true, trackingToken: true } });
    if (o) to = `/pedido/${o.orderNumber}?token=${o.trackingToken}`;
  }
  return Response.redirect(`${origin}${to}`, 303);
}
