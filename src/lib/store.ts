import { cache } from "react";
import { prisma } from "./prisma";

// ÚNICO ponto que resolve "qual loja". Para virar SaaS, troque aqui
// (slug na URL ou domínio) e o resto do código continua igual.
export const getCurrentStore = cache(async () => {
  const id = process.env.STORE_ID;
  const store = id
    ? await prisma.store.findUnique({ where: { id } })
    : await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) throw new Error("Nenhuma loja encontrada. Rode: npm run db:seed");
  return store;
});
