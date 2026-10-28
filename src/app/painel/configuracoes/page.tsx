import { requireStoreRole } from "@/lib/permissions";
import { saveSettings } from "./actions";

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { store } = await requireStoreRole("OWNER");
  const { erro, ok } = await searchParams;
  const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand";
  const card = "space-y-3 rounded-xl border border-line bg-white p-5";
  const label = "block text-sm font-medium";
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
      {erro && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
      {ok && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-ok">Configurações salvas.</p>}
      <form action={saveSettings} className="mt-6 max-w-2xl space-y-5">
        <section className={card}>
          <h2 className="font-semibold">Loja</h2>
          <label className={label}>Nome<input name="name" defaultValue={store.name} required className={`${input} mt-1`} /></label>
          <label className={label}>Texto de apresentação (topo da loja)<textarea name="description" defaultValue={store.description ?? ""} rows={2} className={`${input} mt-1`} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>Telefone<input name="phone" defaultValue={store.phone ?? ""} className={`${input} mt-1`} /></label>
            <label className={label}>WhatsApp (DDD + número)<input name="whatsappNumber" defaultValue={store.whatsappNumber ?? ""} placeholder="61999999999" className={`${input} mt-1`} /></label>
          </div>
          <label className={label}>Situação
            <select name="status" defaultValue={store.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE"} className={`${input} mt-1`}>
              <option value="ACTIVE">Aberta para pedidos</option>
              <option value="SUSPENDED">Pausada (não aceita pedidos)</option>
            </select>
          </label>
        </section>
        <section className={card}>
          <h2 className="font-semibold">Entrega e retirada</h2>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="deliveryEnabled" defaultChecked={store.deliveryEnabled} /> Fazemos entrega</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pickupEnabled" defaultChecked={store.pickupEnabled} /> Permitir retirada na loja</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>Frete (R$)<input name="deliveryFee" type="number" step="0.01" min="0" defaultValue={String(store.deliveryFee)} className={`${input} mt-1`} /></label>
            <label className={label}>Pedido mínimo (R$)<input name="minimumOrderValue" type="number" step="0.01" min="0" defaultValue={String(store.minimumOrderValue)} className={`${input} mt-1`} /></label>
          </div>
          <label className={label}>Endereço de retirada<textarea name="pickupAddress" defaultValue={store.pickupAddress ?? ""} rows={2} className={`${input} mt-1`} /></label>
        </section>
        <button className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-ink hover:brightness-110">Salvar configurações</button>
      </form>
    </>
  );
}
