import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";
import { ProductForm } from "@/components/painel/product-form";
import { saveProduct } from "../actions";

export default async function NovoProduto({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { store, role } = await requireStoreRole("MANAGER");
  const { erro } = await searchParams;
  const sel = { id: true, name: true } as const;
  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({ where: { storeId: store.id }, orderBy: { name: "asc" }, select: sel }),
    prisma.category.findMany({ where: { storeId: store.id }, orderBy: { name: "asc" }, select: sel }),
  ]);
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Novo produto</h1>
      <ProductForm action={saveProduct} brands={brands} categories={categories} canStock={role === "OWNER"} erro={erro}
        initial={{ name: "", brandId: "", categoryId: "", description: "", status: "DRAFT", images: "", variants: [] }} />
    </>
  );
}
