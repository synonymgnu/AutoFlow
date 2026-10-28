"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";

const money = z.coerce.number().min(0).max(100000);
const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome da loja."),
  description: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsappNumber: z.string().transform((s) => s.replace(/\D/g, "")).transform((d) => (d.length === 10 || d.length === 11 ? `55${d}` : d))
    .refine((d) => d === "" || (d.length >= 12 && d.length <= 13), "WhatsApp inválido: use DDD + número."),
  pickupAddress: z.string().trim().max(300).optional(),
  deliveryFee: money, minimumOrderValue: money,
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function saveSettings(fd: FormData) {
  const { store } = await requireStoreRole("OWNER");
  const d = schema.safeParse(Object.fromEntries(fd.entries()));
  const delivery = fd.get("deliveryEnabled") === "on", pickup = fd.get("pickupEnabled") === "on";
  const erro = !d.success ? d.error.issues[0]?.message ?? "Dados inválidos." : !delivery && !pickup ? "Habilite entrega, retirada ou os dois." : "";
  if (erro || !d.success) redirect(`/painel/configuracoes?erro=${encodeURIComponent(erro)}`);
  await prisma.store.update({
    where: { id: store.id },
    data: {
      name: d.data.name, description: d.data.description || null, phone: d.data.phone || null,
      whatsappNumber: d.data.whatsappNumber || null, pickupAddress: d.data.pickupAddress || null,
      deliveryEnabled: delivery, pickupEnabled: pickup,
      deliveryFee: d.data.deliveryFee, minimumOrderValue: d.data.minimumOrderValue, status: d.data.status,
    },
  });
  revalidatePath("/", "layout");
  redirect("/painel/configuracoes?ok=1");
}
