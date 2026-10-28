import { auth } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { CartDrawer } from "@/components/storefront/cart-ui";
import { StoreHeader } from "@/components/storefront/header";

export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <CartProvider userId={session?.user?.id ?? null}>
      <StoreHeader />
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
