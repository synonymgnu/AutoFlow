"use server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentLink, onlineEnabled } from "@/lib/infinitepay";
import { getCurrentStore } from "@/lib/store";

class UserError extends Error {}

export type CepResult =
  | { ok: true; street: string; neighborhood: string; city: string; state: string }
  | { ok: false; error: string };

export async function buscarCep(raw: string): Promise<CepResult> {
  const cep = String(raw).replace(/\D/g, "");
  if (cep.length !== 8) return { ok: false, error: "CEP inválido." };
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!res.ok) throw new Error();
    const d = await res.json();
    if (d.erro) return { ok: false, error: "CEP não encontrado." };
    return { ok: true, street: d.logradouro ?? "", neighborhood: d.bairro ?? "", city: d.localidade ?? "", state: d.uf ?? "" };
  } catch {
    return { ok: false, error: "Não foi possível buscar o CEP. Preencha o endereço manualmente." };
  }
}

const address = z.object({
  cep: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().length(8, "CEP inválido.")),
  street: z.string().trim().min(2, "Informe a rua."),
  number: z.string().trim().min(1, "Informe o número.").max(10),
  complement: z.string().trim().max(60).optional(),
  neighborhood: z.string().trim().min(2, "Informe o bairro."),
  city: z.string().trim().min(2, "Informe a cidade."),
  state: z.string().trim().length(2, "UF inválida.").transform((s) => s.toUpperCase()),
});
const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  phone: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().min(10, "Informe o telefone com DDD.")),
  fulfillment: z.enum(["DELIVERY", "PICKUP"]),
  payment: z.enum(["ONLINE", "WHATSAPP"]).default("WHATSAPP"),
  address: address.optional(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(z.object({ variantId: z.string().min(1), qty: z.number().int().min(1).max(99) })).min(1).max(30),
});
export type Result = { ok: true; url: string; external?: boolean } | { ok: false; error: string };

// Regras de compra aplicadas no servidor (o navegador não é confiável):
// 1) exige login; 2) loja ativa; 3) modalidade habilitada; 4) entrega exige endereço com CEP;
// 5) itens ativos e com estoque; 6) pedido mínimo; 7) preço e frete vêm do banco.
export async function finalizarPedido(input: unknown): Promise<Result> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Faça login para finalizar a compra." };
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Dados inválidos." };
  const d = p.data;
  const store = await getCurrentStore();
  try {
    if (store.status !== "ACTIVE") throw new UserError("A loja não está aceitando pedidos agora.");
    const delivery = d.fulfillment === "DELIVERY";
    if (delivery ? !store.deliveryEnabled : !store.pickupEnabled) throw new UserError("Esta modalidade não está disponível.");
    const a = d.address;
    if (delivery && !a) throw new UserError("Informe o endereço de entrega.");
    const want = new Map<string, number>();
    for (const i of d.items) want.set(i.variantId, (want.get(i.variantId) ?? 0) + i.qty);

    const res = await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: [...want.keys()] }, isActive: true, product: { storeId: store.id, status: "ACTIVE" } },
        include: { product: true },
      });
      if (variants.length !== want.size) throw new UserError("Algum item do carrinho não está mais disponível.");
      let subtotal = 0;
      const items = [];
      for (const v of variants) {
        const q = want.get(v.id)!;
        const r = await tx.productVariant.updateMany({ where: { id: v.id, stock: { gte: q } }, data: { stock: { decrement: q } } });
        if (r.count !== 1) throw new UserError(`Sem estoque suficiente: ${v.product.name} (${v.name}).`);
        const line = Math.round(Number(v.price) * q * 100) / 100;
        subtotal += line;
        items.push({ variantId: v.id, productName: v.product.name, variantName: v.name, quantity: q, unitPrice: v.price, lineTotal: line });
      }
      if (subtotal < Number(store.minimumOrderValue)) {
        throw new UserError(`O pedido mínimo é de R$ ${Number(store.minimumOrderValue).toFixed(2).replace(".", ",")}.`);
      }
      const fee = delivery ? Number(store.deliveryFee) : 0;
      const s = await tx.store.update({ where: { id: store.id }, data: { nextOrderNumber: { increment: 1 } }, select: { nextOrderNumber: true } });

      // cliente ligado à conta de login; guarda telefone e último endereço para as próximas compras
      const data = {
        name: d.name, phone: d.phone,
        ...(delivery && a ? { cep: a.cep, street: a.street, number: a.number, complement: a.complement || null, neighborhood: a.neighborhood, city: a.city, state: a.state } : {}),
      };
      let customer = await tx.customer.findFirst({ where: { storeId: store.id, userId } });
      if (customer) {
        customer = await tx.customer.update({ where: { id: customer.id }, data });
      } else {
        const byPhone = await tx.customer.findUnique({ where: { storeId_phone: { storeId: store.id, phone: d.phone } } });
        if (byPhone?.userId && byPhone.userId !== userId) throw new UserError("Este telefone já está vinculado a outra conta.");
        customer = byPhone
          ? await tx.customer.update({ where: { id: byPhone.id }, data: { ...data, userId } })
          : await tx.customer.create({ data: { storeId: store.id, userId, ...data } });
      }

      const token = randomBytes(18).toString("hex");
      const endereco = delivery && a
        ? `Endereço: ${a.street}, ${a.number}${a.complement ? ` (${a.complement})` : ""} - ${a.neighborhood}, ${a.city}/${a.state} - CEP ${a.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}`
        : null;
      const notes = [endereco, d.notes || null].filter(Boolean).join("\n");
      const created = await tx.order.create({
        data: {
          storeId: store.id, customerId: customer.id, orderNumber: s.nextOrderNumber - 1, trackingToken: token,
          channel: store.whatsappNumber ? "WHATSAPP" : "WEB", fulfillmentType: d.fulfillment,
          customerName: d.name, customerPhone: d.phone, subtotal, deliveryFee: fee, total: subtotal + fee,
          notes: notes || null, items: { create: items },
        },
      });
      return { n: s.nextOrderNumber - 1, token, id: created.id };
    });
    if (d.payment === "ONLINE" && onlineEnabled()) {
      const full = await prisma.order.findUnique({ where: { id: res.id }, include: { items: true } });
      const link = full ? await createPaymentLink(full, session?.user?.email) : null;
      if (link) return { ok: true, url: link, external: true };
    }
    return { ok: true, url: `/pedido/${res.n}?token=${res.token}` };
  } catch (e) {
    return { ok: false, error: e instanceof UserError ? e.message : "Não foi possível finalizar o pedido. Tente novamente." };
  }
}
