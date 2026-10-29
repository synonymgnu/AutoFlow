"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type L = [string, string];
// Barra de navegação fixa no celular; o que não cabe vai para “Mais”.
export function BottomNav({ main, more }: { main: L[]; more: L[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const on = (h: string) => (h === "/painel" ? path === h : path.startsWith(h));
  const tab = (a: boolean) => `flex flex-1 flex-col items-center justify-center py-3.5 text-xs ${a ? "font-semibold text-brand" : "text-white/70"}`;
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-2 bottom-14 rounded-xl bg-ink-soft p-2 text-white shadow-xl">
            {more.map(([h, l]) => <Link key={h} href={h} className="block rounded-lg px-4 py-3 text-sm hover:bg-white/10">{l}</Link>)}
          </div>
        </div>
      )}
      <nav aria-label="Navegação" className="fixed inset-x-0 bottom-0 z-50 flex bg-ink md:hidden">
        {main.map(([h, l]) => <Link key={h} href={h} className={tab(on(h))}>{l}</Link>)}
        <button onClick={() => setOpen((o) => !o)} className={tab(open)}>Mais</button>
      </nav>
    </>
  );
}
