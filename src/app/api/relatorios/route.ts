import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { checkStoreRole } from "@/lib/permissions";
import { buildReport, today } from "@/lib/report";
import { STATUS } from "@/lib/order-status";

export const runtime = "nodejs";
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const safe = (s: string) => s.replace(/[^\u0020-\u00FF]/g, "?"); // fonte padrão do PDF só tem Latin-1

export async function GET(req: Request) {
  const me = await checkStoreRole("MANAGER");
  if (!me) return new Response("Sem permissão", { status: 403 });
  const q = new URL(req.url).searchParams;
  const periodo = ["diario", "semanal", "mensal", "anual"].includes(q.get("periodo") ?? "") ? q.get("periodo")! : "mensal";
  const ds = /^\d{4}-\d{2}-\d{2}$/.test(q.get("data") ?? "") ? q.get("data")! : today();
  const formato = q.get("formato") === "pdf" ? "pdf" : "xlsx";
  const rep = await buildReport(me.store.id, periodo, ds);
  const title = `Relatório ${periodo} — ${rep.label}`;
  const head = { "Content-Disposition": `attachment; filename="relatorio-${periodo}-${ds}.${formato}"`, "Cache-Control": "no-store" };

  if (formato === "xlsx") {
    const wb = new ExcelJS.Workbook(), money = '"R$" #,##0.00';
    const ws = wb.addWorksheet("Resumo");
    ws.addRow([`${me.store.name} — ${title}`]).font = { bold: true, size: 14 };
    ws.addRow([]);
    for (const s of rep.summary) { const r = ws.addRow([s.label, s.value]); if (s.money) r.getCell(2).numFmt = money; }
    ws.columns = [{ width: 30 }, { width: 18 }];
    const wo = wb.addWorksheet("Pedidos");
    wo.addRow(["Nº", "Data", "Cliente", "Telefone", "Modalidade", "Situação", "Pago", "Total"]).font = { bold: true };
    for (const o of rep.orders) wo.addRow([o.orderNumber, rep.fmtDate(o.createdAt), o.customerName, o.customerPhone, o.fulfillmentType === "DELIVERY" ? "Entrega" : "Retirada", STATUS[o.status].label, o.paidAt ? "Sim" : "Não", Number(o.total)]);
    wo.getColumn(8).numFmt = money;
    wo.columns = [6, 18, 28, 16, 12, 18, 7, 14].map((width) => ({ width }));
    const wp = wb.addWorksheet("Produtos");
    wp.addRow(["Produto", "Quantidade", "Total"]).font = { bold: true };
    for (const t of rep.top) wp.addRow([t.name, t.qty, t.total]);
    wp.getColumn(3).numFmt = money;
    wp.columns = [{ width: 44 }, { width: 12 }, { width: 14 }];
    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf as ArrayBuffer, { headers: { ...head, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]), y = 800;
  const text = (t: string, x: number, o: { b?: boolean; size?: number } = {}) => page.drawText(safe(t), { x, y, size: o.size ?? 9, font: o.b ? bold : font });
  const next = (h = 14) => { y -= h; if (y < 50) { page = pdf.addPage([595, 842]); y = 800; } };
  text(`${me.store.name} — ${title}`, 40, { b: true, size: 14 }); next(26);
  for (const s of rep.summary) { text(s.label, 40, { size: 10 }); text(s.money ? brl(s.value) : String(s.value), 230, { b: true, size: 10 }); next(); }
  next(8); text("Pedidos", 40, { b: true, size: 11 }); next(18);
  const cols = [40, 72, 150, 330, 410, 490];
  ["Nº", "Data", "Cliente", "Situação", "Pago", "Total"].forEach((h, i) => text(h, cols[i], { b: true })); next();
  for (const o of rep.orders) {
    [String(o.orderNumber), rep.fmtDate(o.createdAt), o.customerName.slice(0, 32), STATUS[o.status].label, o.paidAt ? "Sim" : "Não", brl(Number(o.total))].forEach((c, i) => text(c, cols[i]));
    next(12);
  }
  next(10); text("Produtos mais vendidos", 40, { b: true, size: 11 }); next(18);
  for (const t of rep.top.slice(0, 25)) { text(t.name.slice(0, 60), 40); text(`${t.qty} un.`, 380); text(brl(t.total), 470); next(12); }
  return new Response(Buffer.from(await pdf.save()), { headers: { ...head, "Content-Type": "application/pdf" } });
}
