export const brl = (v: unknown) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
