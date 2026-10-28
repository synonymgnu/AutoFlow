import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";
import { brl } from "@/lib/format";
import { alternarStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function Produtos() {
  const { store, role } = await requireStoreRole();
  const products = await prisma.product.findMany({
    where: { storeId: store.id }, include: { variants: { orderBy: { price: "asc" } }, brandRef: true }, orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
        <Link href="/painel/produtos/novo" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-ink hover:brightness-110">Novo produto</Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line bg-paper/60 text-ink/60">
            <tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Variantes</th><th className="px-4 py-3 font-medium">Situação</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-ink/60">Nenhum produto ainda. Clique em “Novo produto”.</td></tr>}
            {products.map((p) => (
              <tr key={p.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {(p.images[0] ?? p.imageUrl)
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.images[0] ?? p.imageUrl ?? ""} alt="" className="h-12 w-12 rounded border border-line object-cover" />
                      : <div className="h-12 w-12 rounded bg-paper" />}
                    <div><p className="font-medium">{p.name}</p><p className="text-ink/55">{p.brandRef?.name ?? p.brand ?? "Sem marca"}</p></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink/80">
                  {p.variants.map((v) => (
                    <p key={v.id}>{v.name}: {brl(v.price)}{role === "OWNER" && <> · <span className={v.stock <= 5 ? "text-warn" : ""}>{v.stock} un.</span></>}</p>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.status === "ACTIVE" ? "bg-green-100 text-ok" : "bg-slate-100 text-ink/70"}`}>{p.status === "ACTIVE" ? "Publicado" : "Rascunho"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/painel/produtos/${p.id}`} className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-paper">Editar</Link>
                    <form action={alternarStatus}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-paper">{p.status === "ACTIVE" ? "Despublicar" : "Publicar"}</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
