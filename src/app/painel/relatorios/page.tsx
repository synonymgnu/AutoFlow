import { requireStoreRole } from "@/lib/permissions";
import { today } from "@/lib/report";

export default async function Relatorios() {
  await requireStoreRole("MANAGER");
  const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand";
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
      <p className="mt-1 text-sm text-ink/60">Baixe o resumo de vendas, a lista de pedidos e os produtos mais vendidos do período.</p>
      <form action="/api/relatorios" method="get" className="mt-6 max-w-lg space-y-4 rounded-xl border border-line bg-white p-5">
        <label className="block text-sm font-medium">Período
          <select name="periodo" defaultValue="mensal" className={`${input} mt-1`}>
            <option value="diario">Diário</option><option value="semanal">Semanal (segunda a domingo)</option>
            <option value="mensal">Mensal</option><option value="anual">Anual</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Uma data dentro do período
          <input type="date" name="data" defaultValue={today()} required className={`${input} mt-1`} />
        </label>
        <div className="flex gap-3">
          <button name="formato" value="xlsx" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-ink hover:brightness-110">Baixar Excel (.xlsx)</button>
          <button name="formato" value="pdf" className="rounded-lg border border-ink px-5 py-2.5 text-sm font-medium hover:bg-paper">Baixar PDF</button>
        </div>
      </form>
    </>
  );
}
