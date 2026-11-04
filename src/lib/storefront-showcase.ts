
import { prisma } from "@/lib/prisma";
import type { ShowcaseMode, ShowcaseSectionKey } from "@prisma/client";

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

export async function getStorefrontShowcase(storeId: string) {
  const [configs, products] = await Promise.all([
    prisma.storefrontSection.findMany({
      where: { storeId },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            product: {
              include: {
                brandRef: { select: { name: true, logoUrl: true } },
                variants: {
                  where: { isActive: true, stock: { gt: 0 } },
                  orderBy: { price: "asc" },
                },
              },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),

    prisma.product.findMany({
      where: {
        storeId,
        status: "ACTIVE",
        variants: {
          some: {
            isActive: true,
            stock: { gt: 0 },
          },
        },
      },
      include: {
        brandRef: { select: { name: true, logoUrl: true } },
        variants: {
          where: { isActive: true, stock: { gt: 0 } },
          orderBy: { price: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const sections = DEFAULT_SECTIONS.map((defaults) => {
    const saved = configs.find((config) => config.key === defaults.key);

    return {
      ...defaults,
      ...saved,
      id: saved?.id ?? defaults.key,
      items: saved?.items ?? [],
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);

  return sections
    .filter((section) => section.enabled)
    .map((section) => {
      // No modo Automático a seleção manual guardada é ignorada
      // (senão esses produtos sumiriam da lista automática).
      const usesManual = section.mode !== "AUTOMATIC";

      const manuallySelected = (usesManual ? section.items : [])
        .map((item) => item.product)
        .filter(
          (product) =>
            product.status === "ACTIVE" &&
            product.variants.some(
              (variant) => variant.isActive && variant.stock > 0
            )
        );

      const manualIds = new Set(manuallySelected.map((p) => p.id));

      const eligibleAutomatic = products.filter((product) => {
        if (manualIds.has(product.id)) return false;

        if (section.key === "OFFERS") {
          return product.variants.some(
            (variant) =>
              variant.compareAtPrice !== null &&
              Number(variant.compareAtPrice) > Number(variant.price)
          );
        }

        return true;
      });

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
