import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { getCurrentStore } from "./store";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [
    Google,
    Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.AUTH_EMAIL_FROM }),
  ],
  callbacks: {
    // Qualquer pessoa com e-mail pode entrar (clientes inclusive).
    // O acesso ao painel NÃO depende disso: requireStoreRole() exige StoreMember.
    async signIn({ user }) {
      return Boolean(user.email);
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    // Depois do login, transforma o convite em StoreMember.
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email || !user.id) return;
      const store = await getCurrentStore();
      const invite = await prisma.staffInvite.findUnique({
        where: { storeId_email: { storeId: store.id, email } },
      });
      if (!invite || invite.acceptedAt) return;
      await prisma.$transaction([
        prisma.storeMember.upsert({
          where: { storeId_userId: { storeId: store.id, userId: user.id } },
          update: { role: invite.role },
          create: { storeId: store.id, userId: user.id, role: invite.role },
        }),
        prisma.staffInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
      ]);
    },
  },
});
