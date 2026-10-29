import { prisma } from "./prisma";

const DAY = 86400000, TZ = "America/Sao_Paulo";
const p2 = (n: number) => String(n).padStart(2, "0");
const sp = (ds: string) => new Date(`${ds}T00:00:00-03:00`);
const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: TZ });
export const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });

export function range(periodo: string, ds: string) {
  const [y, m, d] = ds.split("-").map(Number);
  if (periodo === "anual") return { from: sp(`${y}-01-01`), to: sp(`${y + 1}-01-01`), label: `Ano ${y}` };
  if (periodo === "mensal") {
    const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
    return { from: sp(`${y}-${p2(m)}-01`), to: sp(`${ny}-${p2(nm)}-01`), label: `${p2(m)}/${y}` };
  }
  const base = sp(ds);
  if (periodo === "semanal") {
    const wd = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // segunda = 0
    const from = new Date(base.getTime() - wd * DAY);
    return { from, to: new Date(from.getTime() + 7 * DAY), label: `Semana de ${fmt(from)} a ${fmt(new Date(from.getTime() + 6 * DAY))}` };
  }
  return { from: base, to: new Date(base.getTime() + DAY), label: fmt(base) };
}

export async function buildReport(storeId: string, periodo: string, ds: string) {
  const r = range(periodo, ds);
  const orders = await prisma.order.findMany({ where: { storeId, createdAt: { gte: r.from, lt: r.to } }, include: { items: true }, orderBy: { createdAt: "asc" } });
  const valid = orders.filter((o) => o.status !== "CANCELLED");
  const sum = (a: typeof orders) => a.reduce((s, o) => s + Number(o.total), 0);
  const fat = sum(valid), paid = sum(valid.filter((o) => o.paidAt));
  const map = new Map<string, { qty: number; total: number }>();
  for (const o of valid) for (const i of o.items) {
    const k = `${i.productName} (${i.variantName})`, x = map.get(k) ?? { qty: 0, total: 0 };
    x.qty += i.quantity; x.total += Number(i.lineTotal); map.set(k, x);
  }
  return {
    label: r.label, orders, fmtDate: (d: Date) => d.toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }),
    summary: [
      { label: "Pedidos (sem cancelados)", value: valid.length, money: false },
      { label: "Faturamento", value: fat, money: true },
      { label: "Ticket médio", value: valid.length ? fat / valid.length : 0, money: true },
      { label: "Recebido", value: paid, money: true },
      { label: "A receber", value: fat - paid, money: true },
      { label: "Pedidos cancelados", value: orders.length - valid.length, money: false },
    ],
    top: [...map].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
  };
}
