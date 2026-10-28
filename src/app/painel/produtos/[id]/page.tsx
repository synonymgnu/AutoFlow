import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";
import { ProductForm } from "@/components/painel/product-form";
import { saveProduct } from "../actions";

export default async function EditarProduto({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { store, role } = await requireStoreRole("MANAGER");
  const { id } = await params;
  const { erro } = await searchParams;
  const sel = { id: true, name: true } as const;
  const [p, brands, categories] = await Promise.all([
    prisma.product.findFirst({ where: { id, storeId: store.id }, include: { variants: { orderBy: { price: "asc" } } } }),
    prisma.brand.findMany({ where: { storeId: store.id }, orderBy: { name: "asc" }, select: sel }),
    prisma.category.findMany({ where: { storeId: store.id }, orderBy: { name: "asc" }, select: sel }),
  ]);
  if (!p) notFound();
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Editar produto</h1>
      <ProductForm action={saveProduct} brands={brands} categories={categories} canStock={role === "OWNER"} erro={erro}
        initial={{
          id: p.id, name: p.name, brandId: p.brandId ?? "", categoryId: p.categoryId ?? "", description: p.description ?? "",
          status: p.status === "ACTIVE" ? "ACTIVE" : "DRAFT", images: p.images.join("\n"),
          variants: p.variants.map((v) => ({ id: v.id, name: v.name, price: String(v.price), compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : "", sku: v.sku ?? "", stock: String(v.stock) })),
        }} />
    </>
  );
}
