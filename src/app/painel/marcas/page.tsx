import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";
import { ImageUploader } from "@/components/painel/image-upload";
import { criarMarca, excluirMarca } from "../produtos/actions";

export const dynamic = "force-dynamic";

export default async function Marcas({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { store } = await requireStoreRole();
  const { erro } = await searchParams;
  const brands = await prisma.brand.findMany({ where: { storeId: store.id }, orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
  const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand";
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Marcas</h1>
      {erro && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
      <form action={criarMarca} className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white p-5">
        <ImageUploader name="logoUrl" initial={[]} max={1} />
        <input name="name" required placeholder="Nome da marca" className={`${input} max-w-xs flex-1`} />
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-ink hover:brightness-110">Adicionar</button>
      </form>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {brands.length === 0 && <li className="text-sm text-ink/60">Nenhuma marca cadastrada.</li>}
        {brands.map((b) => (
          <li key={b.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
            {b.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={b.logoUrl} alt={b.name} className="h-12 w-12 rounded border border-line object-contain" />
              : <div className="flex h-12 w-12 items-center justify-center rounded bg-ink font-bold text-brand">{b.name.charAt(0)}</div>}
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{b.name}</p><p className="text-xs text-ink/55">{b._count.products} produtos</p></div>
            <form action={excluirMarca}><input type="hidden" name="id" value={b.id} /><button className="text-xs text-red-700 underline">excluir</button></form>
          </li>
        ))}
      </ul>
    </>
  );
}
