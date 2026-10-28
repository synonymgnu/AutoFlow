"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type CartItem = { variantId: string; productName: string; variantName: string; price: number; qty: number };
type Ctx = {
  userId: string | null;
  items: CartItem[]; count: number; total: number; open: boolean;
  setOpen: (v: boolean) => void;
  add: (i: Omit<CartItem, "qty">) => void;
  setQty: (variantId: string, qty: number) => void;
  clear: () => void;
};
const CartCtx = createContext<Ctx | null>(null);
export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart fora do CartProvider");
  return c;
};

const read = (k: string): CartItem[] => {
  try { return JSON.parse(localStorage.getItem(k) ?? "[]"); } catch { return []; }
};
const merge = (a: CartItem[], b: CartItem[]) => {
  const m = new Map(a.map((i) => [i.variantId, { ...i }]));
  for (const i of b) { const x = m.get(i.variantId); if (x) x.qty = Math.min(99, x.qty + i.qty); else m.set(i.variantId, { ...i }); }
  return [...m.values()];
};

// Cada usuário tem o próprio carrinho (chave por userId). Ao entrar, o carrinho de visitante é incorporado ao dele.
export function CartProvider({ children, userId = null }: { children: React.ReactNode; userId?: string | null }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const key = userId ? `cart:${userId}` : "cart:guest";

  useEffect(() => {
    let list = read(key);
    if (userId) {
      const guest = read("cart:guest");
      if (guest.length) { list = merge(list, guest); try { localStorage.removeItem("cart:guest"); } catch {} }
    }
    setItems(list);
    setReady(true);
  }, [key, userId]);
  useEffect(() => {
    if (ready) try { localStorage.setItem(key, JSON.stringify(items)); } catch {}
  }, [items, ready, key]);

  const add: Ctx["add"] = (i) => {
    setItems((c) => c.some((x) => x.variantId === i.variantId)
      ? c.map((x) => (x.variantId === i.variantId ? { ...x, qty: Math.min(99, x.qty + 1) } : x))
      : [...c, { ...i, qty: 1 }]);
    setOpen(true);
  };
  const setQty: Ctx["setQty"] = (id, q) =>
    setItems((c) => (q <= 0 ? c.filter((x) => x.variantId !== id) : c.map((x) => (x.variantId === id ? { ...x, qty: Math.min(99, q) } : x))));

  const count = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  return (
    <CartCtx.Provider value={{ userId, items, count, total, open, setOpen, add, setQty, clear: () => setItems([]) }}>
      {children}
    </CartCtx.Provider>
  );
}
