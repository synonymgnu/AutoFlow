import { redirect } from "next/navigation";
import type { StoreRole } from "@prisma/client";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { getCurrentStore } from "./store";

const rank: Record<StoreRole, number> = { STAFF: 1, MANAGER: 2, OWNER: 3 };

// Use no começo de TODA página, Server Action e Route Handler do painel.
export async function requireStoreRole(min: StoreRole = "STAFF") {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const store = await getCurrentStore();
  const member = await prisma.storeMember.findUnique({
    where: { storeId_userId: { storeId: store.id, userId: session.user.id } },
  });
  if (!member || rank[member.role] < rank[min]) redirect("/login");
  return { user: session.user, store, role: member.role };
}

// Versão sem redirect, para Route Handlers (API): devolve null se não tiver permissão.
export async function checkStoreRole(min: StoreRole = "STAFF") {
  const session = await auth();
  if (!session?.user?.id) return null;
  const store = await getCurrentStore();
  const m = await prisma.storeMember.findUnique({ where: { storeId_userId: { storeId: store.id, userId: session.user.id } } });
  return m && rank[m.role] >= rank[min] ? { store, role: m.role } : null;
}
