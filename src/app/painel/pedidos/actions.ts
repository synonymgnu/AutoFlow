"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";
import { OPEN, STATUS } from "@/lib/order-status";

class UserError extends Error {}

const schema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().min(10)),
  fulfillment: z.enum(["DELIVERY", "PICKUP"]),
  fee: z.coerce.number().min(0).default(0),
  notes: z.string().trim().optional(),
});

export async function criarPedido(fd: FormData) {
  const { store } = await requireStoreRole("STAFF");
  const parsed = schema.safeParse(Object.fromEntries(fd));
  const want = new Map<string, number>();
  for (let i = 0; i < 4; i++) {
    const id = String(fd.get(`v${i}`) || "");
    const q = Math.floor(Number(fd.get(`q${i}`) || 0));
    if (id && q > 0) want.set(id, (want.get(id) ?? 0) + q);
  }
  let erro = !parsed.success ? "Confira o nome e o telefone." : want.size === 0 ? "Adicione ao menos um item." : "";

  if (!erro && parsed.success) {
    const d = parsed.data;
    try {
      await prisma.$transaction(async (tx) => {
        const variants = await tx.productVariant.findMany({
          where: { id: { in: [...want.keys()] }, isActive: true, product: { storeId: store.id } },
          include: { product: true },
        });
        if (variants.length !== want.size) throw new UserError("Algum item não está mais disponível.");
        let subtotal = 0;
        const items = [];
        for (const v of variants) {
          const q = want.get(v.id)!;
          // baixa condicional: nunca vende acima do estoque, mesmo com pedidos simultâneos
          const r = await tx.productVariant.updateMany({ where: { id: v.id, stock: { gte: q } }, data: { stock: { decrement: q } } });
          if (r.count !== 1) throw new UserError(`Estoque insuficiente: ${v.product.name} (${v.name}).`);
          const line = Math.round(Number(v.price) * q * 100) / 100;
          subtotal += line;
          items.push({ variantId: v.id, productName: v.product.name, variantName: v.name, quantity: q, unitPrice: v.price, lineTotal: line });
        }
        const s = await tx.store.update({ where: { id: store.id }, data: { nextOrderNumber: { increment: 1 } }, select: { nextOrderNumber: true } });
        const customer = await tx.customer.upsert({
          where: { storeId_phone: { storeId: store.id, phone: d.phone } },
          update: { name: d.name },
          create: { storeId: store.id, name: d.name, phone: d.phone },
        });
        const fee = d.fulfillment === "DELIVERY" ? d.fee : 0;
        await tx.order.create({
          data: {
            storeId: store.id, customerId: customer.id, orderNumber: s.nextOrderNumber - 1,
            trackingToken: randomBytes(18).toString("hex"), channel: "MANUAL",
            fulfillmentType: d.fulfillment, customerName: d.name, customerPhone: d.phone,
            subtotal, deliveryFee: fee, total: subtotal + fee, notes: d.notes || null,
            items: { create: items },
          },
        });
      });
    } catch (e) {
      erro = e instanceof UserError ? e.message : "Não foi possível criar o pedido.";
    }
  }
  if (erro) redirect(`/painel/pedidos/novo?erro=${encodeURIComponent(erro)}`);
  revalidatePath("/painel", "layout");
  redirect("/painel/pedidos");
}

export async function mudarStatus(fd: FormData) {
  const { store } = await requireStoreRole("STAFF");
  const id = String(fd.get("id"));
  const next = String(fd.get("status")) as OrderStatus;
  if (!(next in STATUS)) return;
  await prisma.$transaction(async (tx) => {
    const o = await tx.order.findFirst({ where: { id, storeId: store.id }, include: { items: true } });
    if (!o || o.status === "CANCELLED" || o.status === next) return;
    if (next === "CANCELLED") {
      for (const it of o.items) {
        if (it.variantId) await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
      }
    }
    await tx.order.update({ where: { id: o.id }, data: { status: next, ...(next === "COMPLETED" ? { paidAt: o.paidAt ?? new Date() } : {}) } });
  });
  revalidatePath("/painel", "layout");
}

// Só o dono exclui. Se o pedido ainda não foi entregue nem cancelado, devolve o estoque antes de apagar.
export async function excluirPedido(fd: FormData) {
  const { store } = await requireStoreRole("OWNER");
  await prisma.$transaction(async (tx) => {
    const o = await tx.order.findFirst({ where: { id: String(fd.get("id")), storeId: store.id }, include: { items: true } });
    if (!o) return;
    if (OPEN.includes(o.status)) {
      for (const it of o.items) {
        if (it.variantId) await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } });
      }
    }
    await tx.order.delete({ where: { id: o.id } });
  });
  revalidatePath("/painel", "layout");
}
