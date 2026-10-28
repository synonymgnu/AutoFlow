import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { brl } from "@/lib/format";
import { ProductView } from "./product-view";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const store = await getCurrentStore();
  return prisma.product.findFirst({
    where: { storeId: store.id, slug, status: "ACTIVE" },
    include: { brandRef: true, variants: { where: { isActive: true }, orderBy: { price: "asc" }, select: { id: true, name: true, price: true, compareAtPrice: true, stock: true } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  return { title: p?.name ?? "Produto" };
}

export default async function Produto({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const images = p.images.length ? p.images : p.imageUrl ? [p.imageUrl] : [];
  const brand = p.brandRef ? { name: p.brandRef.name, logoUrl: p.brandRef.logoUrl } : p.brand ? { name: p.brand, logoUrl: null } : null;
  const related = await prisma.product.findMany({
    where: { storeId: p.storeId, status: "ACTIVE", id: { not: p.id }, OR: [...(p.categoryId ? [{ categoryId: p.categoryId }] : []), ...(p.brandId ? [{ brandId: p.brandId }] : [])] },
    take: 4,
    include: { variants: { where: { isActive: true, stock: { gt: 0 } }, orderBy: { price: "asc" }, select: { price: true }, take: 1 } },
  });
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <Link href="/" className="text-sm text-ink/60 hover:text-ink">← Voltar à loja</Link>
      <ProductView
        name={p.name} brand={brand} images={images} description={p.description}
        // o estoque nunca sai do servidor: só um "tem / não tem"
        variants={p.variants.map((v) => ({ id: v.id, name: v.name, price: Number(v.price), compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null, inStock: v.stock > 0 }))}
      />
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold">Você também pode gostar</h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`/produto/${r.slug}`} className="block overflow-hidden rounded-xl border border-line bg-white hover:shadow-lg">
                  {(r.images[0] ?? r.imageUrl)
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={r.images[0] ?? r.imageUrl ?? ""} alt={r.name} className="aspect-square w-full object-cover" />
                    : <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-ink-soft to-brand text-4xl font-bold text-white/80">{r.name.charAt(0).toUpperCase()}</div>}
                  <div className="p-3">
                    <p className="text-sm font-medium leading-snug">{r.name}</p>
                    <p className="mt-1 text-sm font-bold text-brand-dark">{r.variants[0] ? brl(r.variants[0].price) : "Esgotado"}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
