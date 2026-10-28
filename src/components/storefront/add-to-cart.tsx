"use client";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";

type V = { id: string; name: string; price: number };

export function AddToCart({ productName, variants }: { productName: string; variants: V[] }) {
  const { add } = useCart();
  const [sel, setSel] = useState(variants[0]?.id);
  const v = variants.find((x) => x.id === sel);
  if (!v) return <p className="mt-4 font-semibold text-ink/55">Esgotado</p>;
  return (
    <div>
      {variants.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tamanho">
          {variants.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={x.id === sel} onClick={() => setSel(x.id)}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${x.id === sel ? "border-brand bg-brand text-ink" : "border-line text-ink/70 hover:bg-paper"}`}>
              {x.name}
            </button>
          ))}
        </div>
      )}
      <p className="mt-4 text-lg font-bold text-brand-dark">{brl(v.price)}</p>
      <button onClick={() => add({ variantId: v.id, productName, variantName: v.name, price: v.price })}
        className="mt-3 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink hover:brightness-110">
        Comprar
      </button>
    </div>
  );
}
