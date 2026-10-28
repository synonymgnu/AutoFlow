import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL?.toLowerCase();
  if (!email) throw new Error("Defina OWNER_EMAIL no .env");
  const store =
    (await prisma.store.findFirst()) ??
    (await prisma.store.create({ data: { name: "Minha Loja", slug: "minha-loja" } }));
  await prisma.staffInvite.upsert({
    where: { storeId_email: { storeId: store.id, email } },
    update: { role: "OWNER" },
    create: { storeId: store.id, email, role: "OWNER" },
  });
  console.log(`Loja: ${store.id}\nConvite OWNER: ${email}\nColoque STORE_ID=${store.id} no .env`);
}
main().finally(() => prisma.$disconnect());
