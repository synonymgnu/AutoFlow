"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";

type V = { id: string; name: string; price: number; compareAtPrice: number | null; inStock: boolean };
type Props = { name: string; brand: { name: string; logoUrl: string | null } | null; images: string[]; description: string | null; variants: V[] };

export function ProductView({ name, brand, images, description, variants }: Props) {
  const { add } = useCart();
  const [sel, setSel] = useState((variants.find((v) => v.inStock) ?? variants[0])?.id);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState(false);
  const v = variants.find((x) => x.id === sel);
  const cur = images[img];

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBox(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  const buy = () => { if (v?.inStock) for (let i = 0; i < qty; i++) add({ variantId: v.id, productName: name, variantName: v.name, price: v.price }); };
  const off = v?.compareAtPrice && v.compareAtPrice > v.price ? Math.round((1 - v.price / v.compareAtPrice) * 100) : 0;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <div
          className="relative aspect-square cursor-zoom-in overflow-hidden rounded-xl border border-line bg-white"
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => cur && setBox(true)}
        >
          {cur ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cur} alt={name} className="h-full w-full object-contain transition-transform duration-100"
              style={{ transform: zoom ? "scale(2)" : "scale(1)", transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center" }} />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-ink-soft to-brand text-7xl font-bold text-white/80">{name.charAt(0).toUpperCase()}</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((u, i) => (
              <button key={i} onClick={() => setImg(i)} aria-label={`Imagem ${i + 1}`}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${i === img ? "border-brand" : "border-line"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {cur && <p className="mt-2 text-xs text-ink/50">Passe o mouse para ampliar · clique para tela cheia</p>}
      </div>

      <div>
        {brand && (
          <div className="flex items-center gap-2">
            {brand.logoUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={brand.logoUrl} alt="" className="h-9 w-9 rounded border border-line bg-white object-contain" />}
            <span className="text-sm font-medium text-ink/70">{brand.name}</span>
          </div>
        )}
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">{name}</h1>

        {v ? (
          <div className="mt-4">
            {off > 0 && <p className="text-sm text-ink/50 line-through">{brl(v.compareAtPrice)}</p>}
            <p className="text-3xl font-bold text-brand-dark">
              {brl(v.price)} {off > 0 && <span className="ml-1 rounded bg-ink px-2 py-0.5 align-middle text-xs text-brand">-{off}%</span>}
            </p>
          </div>
        ) : <p className="mt-4 text-ink/60">Indisponível no momento.</p>}

        {variants.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium">Tamanho: <span className="text-ink/60">{v?.name}</span></p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Tamanho">
              {variants.map((x) => (
                <button key={x.id} role="radio" aria-checked={x.id === sel} disabled={!x.inStock} onClick={() => setSel(x.id)}
                  className={`rounded-lg border px-4 py-2 text-sm ${x.id === sel ? "border-brand bg-brand font-semibold text-ink" : "border-line bg-white hover:bg-paper"} ${!x.inStock ? "cursor-not-allowed text-ink/35 line-through" : ""}`}>
                  {x.name}
                </button>
              ))}
            </div>
            {variants.some((x) => !x.inStock) && <p className="mt-1 text-xs text-ink/50">Tamanhos riscados estão esgotados.</p>}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-line bg-white">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-11 w-10" aria-label="Diminuir">−</button>
            <span className="w-8 text-center text-sm">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(20, q + 1))} className="h-11 w-10" aria-label="Aumentar">+</button>
          </div>
          <button onClick={buy} disabled={!v?.inStock}
            className="h-11 flex-1 rounded-lg bg-brand px-6 text-sm font-semibold text-ink hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
            {v?.inStock ? "Adicionar ao carrinho" : "Esgotado"}
          </button>
        </div>

        {description && (
          <section className="mt-8 border-t border-line pt-6">
            <h2 className="font-semibold">Sobre o produto</h2>
            {brand?.logoUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={brand.logoUrl} alt={brand.name} className="mt-3 h-12 object-contain" />}
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/80">{description}</p>
          </section>
        )}
      </div>

      {box && cur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setBox(false)} role="dialog" aria-label="Imagem ampliada">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur} alt={name} className="max-h-full max-w-full object-contain" />
          <button className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-sm">Fechar</button>
        </div>
      )}
    </div>
  );
}
