import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";
import { brl } from "@/lib/format";
import { criarPedido } from "../actions";

export default async function NovoPedido({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { store } = await requireStoreRole();
  const { erro } = await searchParams;
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true, stock: { gt: 0 }, product: { storeId: store.id, status: "ACTIVE" } },
    include: { product: true },
    orderBy: [{ product: { name: "asc" } }, { price: "asc" }],
  });
  const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand";
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Novo pedido</h1>
      <p className="mt-1 text-sm text-ink/60">Para pedidos feitos por WhatsApp, telefone ou no balcão. Preço e estoque vêm do cadastro.</p>
      {erro && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
      <form action={criarPedido} className="mt-6 space-y-6 rounded-xl border border-line bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Nome do cliente" className={input} />
          <input name="phone" required placeholder="Telefone com DDD" className={input} />
          <select name="fulfillment" className={input}><option value="PICKUP">Retirada</option><option value="DELIVERY">Entrega</option></select>
          <input name="fee" type="number" step="0.01" min="0" placeholder="Frete (só entrega)" className={input} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Itens</p>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem] gap-2">
              <select name={`v${i}`} className={input} defaultValue="">
                <option value="">{i === 0 ? "Escolha o produto" : "— opcional —"}</option>
                {variants.map((v) => <option key={v.id} value={v.id}>{v.product.name} — {v.name} ({brl(v.price)})</option>)}
              </select>
              <input name={`q${i}`} type="number" min="1" placeholder="Qtd" className={input} />
            </div>
          ))}
        </div>
        <textarea name="notes" rows={2} placeholder="Observações" className={input} />
        <button className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-ink hover:brightness-110">Criar pedido</button>
      </form>
    </>
  );
}
