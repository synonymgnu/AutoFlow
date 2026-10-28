import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";
import { criarCategoria, excluirCategoria } from "../produtos/actions";

export const dynamic = "force-dynamic";

export default async function Categorias({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { store } = await requireStoreRole();
  const { erro } = await searchParams;
  const cats = await prisma.category.findMany({ where: { storeId: store.id }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
      {erro && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
      <form action={criarCategoria} className="mt-6 flex gap-3 rounded-xl border border-line bg-white p-5">
        <input name="name" required placeholder="Ex.: Shampoos, Ceras, Polidores" className="w-full max-w-sm rounded-lg border border-line px-3 py-2 text-sm focus:border-brand" />
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-ink hover:brightness-110">Adicionar</button>
      </form>
      <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-white">
        {cats.length === 0 && <li className="p-4 text-sm text-ink/60">Nenhuma categoria cadastrada.</li>}
        {cats.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{c.name} <span className="text-ink/50">· {c._count.products} produtos</span></span>
            <form action={excluirCategoria}><input type="hidden" name="id" value={c.id} /><button className="text-xs text-red-700 underline">excluir</button></form>
          </li>
        ))}
      </ul>
    </>
  );
}
