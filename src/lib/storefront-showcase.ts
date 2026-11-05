import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma, ShowcaseMode, ShowcaseSectionKey } from "@prisma/client";

type SectionConfig = {
  key: ShowcaseSectionKey;
  title: string;
  subtitle: string;
  enabled: boolean;
  mode: ShowcaseMode;
  maxItems: number;
  sortOrder: number;
};

export const DEFAULT_SECTIONS: SectionConfig[] = [
  {
    key: "OFFERS",
    title: "Ofertas especiais",
    subtitle: "Aproveite nossas condições especiais.",
    enabled: true,
    mode: "AUTOMATIC",
    maxItems: 8,
    sortOrder: 0,
  },
  {
    key: "FEATURED",
    title: "Produtos em destaque",
    subtitle: "Selecionados para você.",
    enabled: true,
    mode: "AUTOMATIC",
    maxItems: 8,
    sortOrder: 1,
  },
];

export const SHOWCASE_CACHE_TAG = "showcase";

// Só os campos que o card do carousel usa (nada de description, estoque etc.).
const inStock = { isActive: true, stock: { gt: 0 } } as const;
const productSelect = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  images: true,
  imageUrl: true,
  brandRef: { select: { name: true, logoUrl: true } },
  variants: {
    where: inStock,
    orderBy: { price: "asc" },
    select: { name: true, price: true, compareAtPrice: true },
  },
} satisfies Prisma.ProductSelect;

type RawProduct = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

// Objeto simples (sem Decimal), pronto para ir ao cliente e para o cache.
export type ShowcaseProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  image: string | null;
  brandLogoUrl: string | null;
  brandName: string | null;
  variants: { name: string; price: number; compareAtPrice: number | null }[];
};

const toProduct = (p: RawProduct): ShowcaseProduct => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  brand: p.brand,
  image: p.images[0] ?? p.imageUrl ?? null,
  brandLogoUrl: p.brandRef?.logoUrl ?? null,
  brandName: p.brandRef?.name ?? null,
  variants: p.variants.map((v) => ({
    name: v.name,
    price: Number(v.price),
    compareAtPrice: v.compareAtPrice === null ? null : Number(v.compareAtPrice),
  })),
});

const hasDiscount = (p: ShowcaseProduct) =>
  p.variants.some((v) => v.compareAtPrice !== null && v.compareAtPrice > v.price);

async function loadShowcase(storeId: string) {
  const configs = await prisma.storefrontSection.findMany({
    where: { storeId },
    include: {
      items: { orderBy: { sortOrder: "asc" }, select: { productId: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const sections = DEFAULT_SECTIONS.map((defaults) => {
    const saved = configs.find((config) => config.key === defaults.key);
    return {
      ...defaults,
      ...saved,
      id: saved?.id ?? defaults.key,
      items: saved?.items ?? [],
    };
  })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((section) => section.enabled);

  if (!sections.length) return [];

  // No modo Automático a seleção manual guardada é ignorada
  // (senão esses produtos sumiriam da lista automática).
  const manualIdsOf = (s: (typeof sections)[number]) =>
    s.mode === "AUTOMATIC" ? [] : s.items.map((i) => i.productId);

  const allManualIds = [...new Set(sections.flatMap(manualIdsOf))];
  const needsAutomatic = sections.filter((s) => s.mode !== "MANUAL");

  const active = { storeId, status: "ACTIVE" as const };

  // Em vez de carregar o catálogo inteiro, busca só o que a vitrine vai mostrar.
  const [manualRaw, featuredRaw, offersRaw] = await Promise.all([
    allManualIds.length
      ? prisma.product.findMany({
          where: { ...active, id: { in: allManualIds }, variants: { some: inStock } },
          select: productSelect,
        })
      : Promise.resolve([]),

    needsAutomatic.some((s) => s.key === "FEATURED")
      ? prisma.product.findMany({
          where: { ...active, variants: { some: inStock } },
          select: productSelect,
          orderBy: { createdAt: "desc" },
          // maxItems máximo é 24; folga para descontar os escolhidos à mão
          take: 24 + allManualIds.length,
        })
      : Promise.resolve([]),

    needsAutomatic.some((s) => s.key === "OFFERS")
      ? prisma.product.findMany({
          // O banco não compara duas colunas (compareAtPrice > price), então
          // filtra quem tem preço "de" e confirma o desconto em memória.
          where: {
            ...active,
            variants: { some: { ...inStock, compareAtPrice: { not: null } } },
          },
          select: productSelect,
          orderBy: { createdAt: "desc" },
          take: 60,
        })
      : Promise.resolve([]),
  ]);

  const manualById = new Map(manualRaw.map((p) => [p.id, toProduct(p)]));
  const featured = featuredRaw.map(toProduct);
  const offers = offersRaw.map(toProduct).filter(hasDiscount);

  return sections
    .map((section) => {
      const manuallySelected = manualIdsOf(section)
        .map((id) => manualById.get(id))
        .filter((p): p is ShowcaseProduct => Boolean(p));
      const manualIds = new Set(manuallySelected.map((p) => p.id));

      const pool = section.key === "OFFERS" ? offers : featured;
      const eligibleAutomatic = pool.filter((p) => !manualIds.has(p.id));

      const selected =
        section.mode === "MANUAL"
          ? manuallySelected
          : section.mode === "MIXED"
            ? [
                ...manuallySelected,
                ...eligibleAutomatic.slice(
                  0,
                  Math.max(0, section.maxItems - manuallySelected.length)
                ),
              ]
            : eligibleAutomatic.slice(0, section.maxItems);

      return {
        id: section.id,
        key: section.key,
        title: section.title,
        subtitle: section.subtitle,
        mode: section.mode,
        products: selected.slice(0, section.maxItems),
      };
    })
    .filter((section) => section.products.length > 0);
}

// A vitrine é igual para todos os visitantes, então é guardada por 60 s e
// invalidada na hora quando o painel altera produtos ou a própria vitrine.
export const getStorefrontShowcase = (storeId: string) =>
  unstable_cache(() => loadShowcase(storeId), ["storefront-showcase", storeId], {
    revalidate: 60,
    tags: [SHOWCASE_CACHE_TAG],
  })();
