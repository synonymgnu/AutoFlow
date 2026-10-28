import type { OrderStatus } from "@prisma/client";

export const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: { label: "Pendente", cls: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmado", cls: "bg-blue-100 text-blue-800" },
  PROCESSING: { label: "Em separação", cls: "bg-indigo-100 text-indigo-800" },
  READY: { label: "Pronto", cls: "bg-cyan-100 text-cyan-800" },
  OUT_FOR_DELIVERY: { label: "Saiu para entrega", cls: "bg-violet-100 text-violet-800" },
  COMPLETED: { label: "Concluído", cls: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelado", cls: "bg-slate-200 text-slate-600" },
};
export const OPEN: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY"];
