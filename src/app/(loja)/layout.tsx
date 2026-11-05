import { getSession } from "@/lib/session";
import { CartProvider } from "@/lib/cart";
import { CartDrawer } from "@/components/storefront/cart-ui";
import { StoreHeader } from "@/components/storefront/header";

export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <CartProvider userId={session?.user?.id ?? null}>
      <StoreHeader />
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
