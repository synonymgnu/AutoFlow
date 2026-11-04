"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";

export type ShowcaseState = { ok?: boolean; error?: string };

const LABELS = {
  OFFERS: "Ofertas especiais",
  FEATURED: "Produtos em destaque",
} as const;
const SORT = { OFFERS: 0, FEATURED: 1 } as const;

const sectionSchema = z.object({
  key: z.enum(["OFFERS", "FEATURED"]),
  enabled: z.boolean(),
  mode: z.enum(["AUTOMATIC", "MANUAL", "MIXED"]),
  title: z
    .string()
    .trim()
    .min(1, "informe o título.")
    .max(80, "o título pode ter no máximo 80 caracteres."),
  subtitle: z
    .string()
    .trim()
    .max(160, "o subtítulo pode ter no máximo 160 caracteres."),
  maxItems: z.coerce
    .number()
    .int("a quantidade deve ser um número inteiro.")
    .min(1, "a quantidade mínima é 1.")
    .max(24, "a quantidade máxima é 24."),
  productIds: z.array(z.string().min(1)).max(48, "escolha no máximo 48 produtos."),
});

type Section = z.infer<typeof sectionSchema>;

export async function saveShowcase(
  _prev: ShowcaseState,
  fd: FormData
): Promise<ShowcaseState> {
  // Mesma regra de edição de produtos: dono e gerente.
  const { store } = await requireStoreRole("MANAGER");

  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("payload") ?? ""));
  } catch {
    return { error: "Não foi possível ler os dados do formulário." };
  }
  if (!Array.isArray(raw)) return { error: "Dados inválidos." };

  const sections: Section[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    const parsed = sectionSchema.safeParse(item);
    if (!parsed.success) {
      const key = (item as { key?: string } | null)?.key;
      const label = key && key in LABELS ? LABELS[key as keyof typeof LABELS] : "Vitrine";
      return { error: `${label}: ${parsed.error.issues[0]?.message ?? "dados inválidos."}` };
    }
    if (seen.has(parsed.data.key)) return { error: "Dados inválidos." };
    seen.add(parsed.data.key);
    sections.push({ ...parsed.data, productIds: [...new Set(parsed.data.productIds)] });
  }
  if (seen.size !== Object.keys(LABELS).length) return { error: "Dados inválidos." };

  for (const s of sections) {
    if (s.enabled && s.mode === "MANUAL" && s.productIds.length === 0) {
      return {
        error: `${LABELS[s.key]}: escolha ao menos um produto ou mude o modo para Automático ou Misto.`,
      };
    }
  }

  // Só aceita produtos desta loja (o id vem do navegador, não dá pra confiar).
  const allIds = [...new Set(sections.flatMap((s) => s.productIds))];
  if (allIds.length) {
    const owned = await prisma.product.count({
      where: { id: { in: allIds }, storeId: store.id },
    });
    if (owned !== allIds.length) {
      return {
        error:
          "Algum produto escolhido não foi encontrado nesta loja. Recarregue a página e tente de novo.",
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const s of sections) {
        const data = {
          title: s.title,
          subtitle: s.subtitle || null,
          enabled: s.enabled,
          mode: s.mode,
          maxItems: s.maxItems,
        };
        const row = await tx.storefrontSection.upsert({
          where: { storeId_key: { storeId: store.id, key: s.key } },
          update: data,
          create: { storeId: store.id, key: s.key, sortOrder: SORT[s.key], ...data },
        });

        // A seleção manual é guardada mesmo no modo Automático,
        // assim a loja não perde a lista se mudar de ideia.
        await tx.storefrontSectionItem.deleteMany({ where: { sectionId: row.id } });
        if (s.productIds.length) {
          await tx.storefrontSectionItem.createMany({
            data: s.productIds.map((productId, i) => ({
              sectionId: row.id,
              productId,
              sortOrder: i,
            })),
          });
        }
      }
    });
  } catch {
    return { error: "Não foi possível salvar a vitrine. Tente novamente." };
  }

  revalidatePath("/painel/vitrine");
  revalidatePath("/");
  return { ok: true };
}
