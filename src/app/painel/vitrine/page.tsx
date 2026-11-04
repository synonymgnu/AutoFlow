import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";
import { DEFAULT_SECTIONS } from "@/lib/storefront-showcase";
import { ShowcaseForm, type PickerProduct, type SectionDraft } from "./showcase-form";

export const dynamic = "force-dynamic";

export default async function VitrinePainel() {
  const { store } = await requireStoreRole("MANAGER");

  const [saved, products] = await Promise.all([
    prisma.storefrontSection.findMany({
      where: { storeId: store.id },
      include: { items: { orderBy: { sortOrder: "asc" }, select: { productId: true } } },
    }),
    prisma.product.findMany({
      where: { storeId: store.id },
      include: {
        brandRef: { select: { name: true } },
        variants: {
          where: { isActive: true },
          select: { price: true, compareAtPrice: true, stock: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Seção ainda não salva = valores padrão (os mesmos que a loja usa).
  const initial: SectionDraft[] = DEFAULT_SECTIONS.map((d) => {
    const row = saved.find((r) => r.key === d.key);
    return {
      key: d.key,
      enabled: row?.enabled ?? d.enabled,
      mode: row?.mode ?? d.mode,
      title: row?.title ?? d.title,
      subtitle: row ? (row.subtitle ?? "") : d.subtitle,
      maxItems: String(row?.maxItems ?? d.maxItems),
      productIds: row?.items.map((i) => i.productId) ?? [],
    };
  });

  const pickerProducts: PickerProduct[] = products.map((p) => {
    const inStock = p.variants.filter((v) => v.stock > 0);
    const pool = inStock.length ? inStock : p.variants;
    return {
      id: p.id,
      name: p.name,
      brand: p.brandRef?.name ?? p.brand,
      image: p.images[0] ?? p.imageUrl ?? null,
      price: pool.length ? Math.min(...pool.map((v) => Number(v.price))) : null,
      onSale: inStock.some(
        (v) => v.compareAtPrice !== null && Number(v.compareAtPrice) > Number(v.price)
      ),
      blockedReason:
        p.status === "ARCHIVED"
          ? "Arquivado"
          : p.status !== "ACTIVE"
            ? "Rascunho"
            : inStock.length === 0
              ? "Sem estoque"
              : null,
    };
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vitrine</h1>
          <p className="mt-1 text-sm text-ink/60">
            Escolha como os produtos aparecem na página inicial da loja.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm hover:bg-paper"
        >
          Ver a loja
        </a>
      </div>
      <ShowcaseForm initial={initial} products={pickerProducts} />
    </>
  );
}
