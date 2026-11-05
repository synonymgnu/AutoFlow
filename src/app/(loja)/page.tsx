import Image from "next/image";
import Link from "next/link";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { getStorefrontShowcase } from "@/lib/storefront-showcase";

import { AddToCart } from "@/components/storefront/add-to-cart";
import { OfferCarousel, type Offer } from "@/components/ui/offer-carousel";

export const dynamic = "force-dynamic";

type SP = {
  q?: string;
  categoria?: string;
  ordem?: string;
  page?: string;
};

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

  //local onde estava dando problema por repetição do export default
export default async function Vitrine({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const resolvedParams = await searchParams;
  const { q = "", categoria, ordem = "novos", page = "1" } = resolvedParams;

  const store = await getCurrentStore();
  const term = q.trim().slice(0, 60);

  //logica de paginação aqui abaixo 
  const ITEMS_PER_PAGE = 8;
  const currentPage = Math.max(1, Number(page) || 1);
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  //extrair o where para usar tanto na busca quanto na contagem
  const productsWhere: Prisma.ProductWhereInput = {
    storeId: store.id,
    status: "ACTIVE",
    ...(categoria ? { category: { slug: categoria } } : {}),
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { brandRef: { name: { contains: term, mode: "insensitive" } } },
            { description: { contains: term, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [categories, found, showcase, totalCount] = await Promise.all([
    prisma.category.findMany({
      where: {
        storeId: store.id,
        products: { some: { status: "ACTIVE" } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),

    prisma.product.findMany({
      where: productsWhere,
      include: {
        brandRef: { select: { name: true } },
        variants: {
          where: {
            isActive: true,
            stock: { gt: 0 },
          },
          select: {
            id: true,
            name: true,
            price: true,
          },
          orderBy: { price: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: ITEMS_PER_PAGE,
      skip,
    }),

    getStorefrontShowcase(store.id),

    prisma.product.count({
      where: productsWhere,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const pr = (p: (typeof found)[number], none: number) =>
    p.variants.length ? Number(p.variants[0].price) : none;

  // Mantém a ordenação em memória (agora aplicada apenas aos itens da página atual)
  const products =
    ordem === "menor"
      ? [...found].sort((a, b) => pr(a, Infinity) - pr(b, Infinity))
      : ordem === "maior"
      ? [...found].sort((a, b) => pr(b, -1) - pr(a, -1))
      : found;

  // url para troca de Categorias (reseta a página para 1) provavelmente aqui será onde criar a nova implementação de categorizar por estágios de lavagem.
  const getCategoryUrl = (c?: string) => {
    const sp = new URLSearchParams();
    if (term) sp.set("q", term);
    if (c) sp.set("categoria", c);
    if (ordem !== "novos") sp.set("ordem", ordem);
    
    const s = sp.toString();
    return `${s ? `/?${s}` : "/"}#produtos`;
  };

  //url   (mantém a categoria e a busca atual)
  const getPageUrl = (p: number) => {
    const sp = new URLSearchParams();
    if (term) sp.set("q", term);
    if (categoria) sp.set("categoria", categoria);
    if (ordem !== "novos") sp.set("ordem", ordem);
    if (p > 1) sp.set("page", p.toString());

    const s = sp.toString();
    return `${s ? `/?${s}` : "/"}#produtos`;
  };

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
      on
        ? "border-brand bg-brand font-semibold text-ink"
        : "border-line bg-white hover:bg-paper"
    }`;

  return (
    <>
      {/* Banner principal */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_38%,rgba(245,196,0,.10)_50%,transparent_62%)]" />

        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <Image
            src="/logo.png"
            alt=""
            width={520}
            height={520}
            priority
            className="pointer-events-none absolute right-2 top-1/2 h-72 w-72 -translate-y-1/2 opacity-15 sm:right-5 sm:h-[26rem] sm:w-[26rem] sm:opacity-100"
          />

          <div className="relative max-w-xl">
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Brilho e proteção para o seu{" "}
              <span className="text-brand">carro</span>
            </h1>

            <p className="mt-4 text-white/75">
              {store.description ??
                "Shampoos, ceras, vitrificadores, polidores e acessórios de detalhamento automotivo."}
            </p>

            <a
              href="#produtos"
              className="mt-8 inline-block rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-ink hover:brightness-110"
            >
              Ver produtos
            </a>
          </div>
        </div>
      </section>

      {/* Seções dinâmicas */}
      {showcase.map((section) => {
        const offers: Offer[] = section.products.map((product) => {
          const discountedVariant = product.variants.find(
            (variant) =>
              variant.compareAtPrice !== null &&
              Number(variant.compareAtPrice) > Number(variant.price)
          );

          const variant =
            section.key === "OFFERS"
              ? discountedVariant ?? product.variants[0]
              : product.variants[0];

          const price = Number(variant.price);
          const originalPrice = variant.compareAtPrice
            ? Number(variant.compareAtPrice)
            : null;

          const hasDiscount = originalPrice !== null && originalPrice > price;

          const description = hasDiscount
            ? `${variant.name} · De ${currency(originalPrice)} por ${currency(price)}`
            : `${variant.name} · ${currency(price)}`;

          return {
            id: product.id,
            imageSrc: product.images[0] ?? product.imageUrl ?? "/logo.png",
            imageAlt: product.name,
            tag:
              section.key === "OFFERS"
                ? hasDiscount
                  ? "Oferta especial"
                  : "Selecionado"
                : "Em destaque",
            title: product.name,
            description,
            brandLogoSrc: product.brandRef?.logoUrl ?? undefined,
            brandName: product.brandRef?.name ?? product.brand ?? store.name,
            href: `/produto/${product.slug}`,
          };
        });

        return (
          <section key={section.id} className="mx-auto max-w-6xl px-5 pt-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-ink">
                  {section.title}
                </h2>

                {section.subtitle && (
                  <p className="mt-1 text-sm text-ink/55">
                    {section.subtitle}
                  </p>
                )}
              </div>

              <span className="text-xs font-medium uppercase tracking-wider text-brand-dark">
                {section.key === "OFFERS" ? "Ofertas" : "Seleção especial"}
              </span>
            </div>

            <OfferCarousel offers={offers} />
          </section>
        );
      })}

      {/* Catálogo */}
      <main id="produtos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-10">
        {/* Quando o usuário faz uma nova busca, a URL não tem page=, resetando para a primeira página automaticamente */}
        <form action="/" className="flex flex-col gap-3 sm:flex-row">
          <input
            name="q"
            defaultValue={term}
            placeholder="Buscar por produto ou marca"
            aria-label="Buscar"
            className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm focus:border-brand"
          />

          {categoria && <input type="hidden" name="categoria" value={categoria} />}

          <select
            name="ordem"
            defaultValue={ordem}
            aria-label="Ordenar"
            className="rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
          >
            <option value="novos">Mais novos</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
          </select>

          <button className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-soft">
            Buscar
          </button>
        </form>

        {categories.length > 0 && (
          <nav
            className="mt-4 flex gap-2 overflow-x-auto pb-1"
            aria-label="Categorias"
          >
            <Link href={getCategoryUrl()} className={chip(!categoria)}>
              Todos
            </Link>

            {categories.map((c) => (
              <Link
                key={c.id}
                href={getCategoryUrl(c.slug)}
                className={chip(categoria === c.slug)}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}

        <p className="mt-6 text-sm text-ink/60">
          {totalCount} {totalCount === 1 ? "produto encontrado" : "produtos encontrados"}
          {term && <> para “{term}”</>}
        </p>

        {products.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line bg-white p-8 text-center text-ink/60">
            Nenhum produto encontrado.{" "}
            <Link href="/#produtos" className="text-brand-dark underline">
              Limpar filtros
            </Link>
          </p>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <li
                key={p.id}
                className="relative overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-lg"
              >
                <Link
                  href={`/produto/${p.slug}`}
                  aria-label={p.name}
                  className="absolute inset-0 z-0"
                />

                {p.images[0] ?? p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.images[0] ?? p.imageUrl ?? ""}
                    alt={p.name}
                    className="block aspect-[4/3] w-full object-contain"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-ink-soft to-brand text-5xl font-bold text-white/80">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="p-4">
                  {(p.brandRef?.name ?? p.brand) && (
                    <p className="text-sm text-ink/55">
                      {p.brandRef?.name ?? p.brand}
                    </p>
                  )}

                  <h3 className="font-semibold leading-snug">{p.name}</h3>

                  <div className="relative z-10 mt-1">
                    <AddToCart
                      productName={p.name}
                      variants={p.variants.map((v) => ({
                        id: v.id,
                        name: v.name,
                        price: Number(v.price),
                      }))}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* NAVEGAÇÃO DA PAGINAÇÃO */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
            <p className="text-sm text-ink/70">
              Página <span className="font-semibold text-ink">{currentPage}</span> de{" "}
              <span className="font-semibold text-ink">{totalPages}</span>
            </p>

            <div className="flex gap-2">
              {currentPage > 1 ? (
                <Link
                  href={getPageUrl(currentPage - 1)}
                  className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-paper"
                >
                  Anterior
                </Link>
              ) : (
                <span className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink/30 cursor-not-allowed">
                  Anterior
                </span>
              )}

              {currentPage < totalPages ? (
                <Link
                  href={getPageUrl(currentPage + 1)}
                  className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-paper"
                >
                  Próxima
                </Link>
              ) : (
                <span className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink/30 cursor-not-allowed">
                  Próxima
                </span>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t-2 border-brand bg-ink py-8 text-center text-sm text-white/60">
        {store.name}
        {store.phone ? ` · ${store.phone}` : ""}
      </footer>
    </>
  );
}