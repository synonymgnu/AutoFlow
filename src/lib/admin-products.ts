import { prisma } from "@/lib/prisma";

const ITEMS_PER_PAGE = 10;

// Fica fora de actions.ts ("use server"): tudo que é exportado lá vira endpoint público.
// Só pega os campos que a tabela do painel mostra (sem descrição, sem categoria).
export async function getProdutosPaginados(storeId: string, page: number = 1) {
  const currentPage = Math.max(1, page);
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
        brand: true,
        status: true,
        images: true,
        imageUrl: true,
        brandRef: { select: { name: true } },
        variants: { select: { id: true, name: true, price: true, stock: true }, orderBy: { price: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: ITEMS_PER_PAGE,
      skip,
    }),
    prisma.product.count({ where: { storeId } }),
  ]);

  return {
    products,
    totalCount,
    totalPages: Math.ceil(totalCount / ITEMS_PER_PAGE),
    currentPage,
  };
}
