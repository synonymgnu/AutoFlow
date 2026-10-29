import { verifyAndMarkPaid } from "@/lib/infinitepay";

export const runtime = "nodejs";

// Responder 200 só quando o pagamento foi confirmado na API; 400 faz a InfinitePay tentar de novo.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.order_nsu || !b?.transaction_nsu || !b?.invoice_slug) return new Response("invalid", { status: 400 });
  const ok = await verifyAndMarkPaid(String(b.order_nsu), String(b.transaction_nsu), String(b.invoice_slug), b.capture_method, b.receipt_url);
  return new Response(ok ? "ok" : "unverified", { status: ok ? 200 : 400 });
}
