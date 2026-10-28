import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function Checkout() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fcheckout"); // compra exige login
  const s = await getCurrentStore();
  const c = await prisma.customer.findFirst({ where: { storeId: s.id, userId: session.user.id } });
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Finalizar pedido</h1>
      <CheckoutForm
        settings={{ deliveryEnabled: s.deliveryEnabled, pickupEnabled: s.pickupEnabled, deliveryFee: Number(s.deliveryFee), minimumOrderValue: Number(s.minimumOrderValue), pickupAddress: s.pickupAddress }}
        initial={{
          name: c?.name ?? session.user.name ?? "", phone: c?.phone ?? "",
          cep: c?.cep ?? "", street: c?.street ?? "", number: c?.number ?? "", complement: c?.complement ?? "",
          neighborhood: c?.neighborhood ?? "", city: c?.city ?? "", state: c?.state ?? "",
        }}
      />
    </main>
  );
}
