"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button onClick={() => setOpen(true)} aria-label={`Abrir carrinho, ${count} itens`}
      className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-ink hover:brightness-110">
      Carrinho
      {count > 0 && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-xs text-brand">{count}</span>}
    </button>
  );
}

export function CartDrawer() {
  const { items, total, open, setOpen, setQty, userId } = useCart();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [setOpen]);
  if (!open) return null;
  const btn = "h-7 w-7 rounded-full border border-line text-sm hover:bg-paper";
  const href = userId ? "/checkout" : "/login?callbackUrl=%2Fcheckout";
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Carrinho">
      <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="font-bold">Seu carrinho</h2>
          <button onClick={() => setOpen(false)} className="text-sm text-ink/60 hover:text-ink">Fechar</button>
        </div>
        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {items.length === 0 && <li className="p-6 text-center text-sm text-ink/60">Seu carrinho está vazio.</li>}
          {items.map((i) => (
            <li key={i.variantId} className="p-4">
              <p className="font-medium leading-snug">{i.productName}</p>
              <p className="text-sm text-ink/55">{i.variantName} · {brl(i.price)}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className={btn} onClick={() => setQty(i.variantId, i.qty - 1)} aria-label="Diminuir">−</button>
                  <span className="w-6 text-center text-sm">{i.qty}</span>
                  <button className={btn} onClick={() => setQty(i.variantId, i.qty + 1)} aria-label="Aumentar">+</button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{brl(i.price * i.qty)}</span>
                  <button className="text-xs text-red-700 underline" onClick={() => setQty(i.variantId, 0)}>remover</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-line p-4">
          <div className="flex justify-between font-semibold"><span>Subtotal</span><span>{brl(total)}</span></div>
          <p className="mt-1 text-xs text-ink/55">Frete calculado na finalização.</p>
          {items.length > 0 && (
            <>
              <Link href={href} onClick={() => setOpen(false)}
                className="mt-3 block rounded-lg bg-brand px-4 py-3 text-center text-sm font-semibold text-ink hover:brightness-110">
                {userId ? "Finalizar pedido" : "Entrar para comprar"}
              </Link>
              {!userId && <p className="mt-2 text-center text-xs text-ink/55">Seu carrinho fica salvo na sua conta depois do login.</p>}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
