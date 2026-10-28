"use client";
import Link from "next/link";
import { useState } from "react";
import { ImageUploader } from "./image-upload";

export type Row = { id?: string; name: string; price: string; compareAtPrice: string; sku: string; stock: string };
type Props = {
  action: (fd: FormData) => void | Promise<void>;
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  canStock: boolean;
  erro?: string;
  initial: { id?: string; name: string; brandId: string; categoryId: string; description: string; status: "DRAFT" | "ACTIVE"; images: string; variants: Row[] };
};
const blank = (name = ""): Row => ({ name, price: "", compareAtPrice: "", sku: "", stock: "0" });
const PRESETS = ["250 ml", "500 ml", "1 L", "5 L"];

export function ProductForm({ action, brands, categories, canStock, erro, initial }: Props) {
  const [rows, setRows] = useState<Row[]>(initial.variants.length ? initial.variants : [blank()]);
  const upd = (i: number, k: keyof Row, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const addPreset = (n: string) =>
    setRows((r) => (r.length === 1 && !r[0].name && !r[0].price ? [{ ...r[0], name: n }] : [...r, blank(n)]));
  const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand";
  const card = "space-y-3 rounded-xl border border-line bg-white p-5";

  return (
    <form action={action} className="mt-6 space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(rows)} />
      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}

      <section className={card}>
        <h2 className="font-semibold">Informações</h2>
        <input name="name" defaultValue={initial.name} required placeholder="Nome do produto" className={input} />
        <div className="grid gap-3 sm:grid-cols-3">
          <select name="brandId" defaultValue={initial.brandId} className={input}>
            <option value="">Sem marca</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select name="categoryId" defaultValue={initial.categoryId} className={input}>
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="status" defaultValue={initial.status} className={input}>
            <option value="DRAFT">Rascunho (não aparece na loja)</option>
            <option value="ACTIVE">Publicado</option>
          </select>
        </div>
        {brands.length === 0 && <p className="text-xs text-ink/55">Nenhuma marca ainda. <Link href="/painel/marcas" className="text-brand-dark underline">Cadastre em Marcas</Link>.</p>}
        <textarea name="description" defaultValue={initial.description} rows={5} placeholder="Descrição, modo de uso, benefícios..." className={input} />
      </section>

      <section className={card}>
        <h2 className="font-semibold">Imagens</h2>
        <ImageUploader name="images" initial={initial.images.split("\n").filter(Boolean)} />
        <p className="text-xs text-ink/55">JPG, PNG ou WebP, até 4 MB. A primeira é a capa.</p>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Variantes</h2>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((n) => <button key={n} type="button" onClick={() => addPreset(n)} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:bg-paper">+ {n}</button>)}
          </div>
        </div>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.id ?? i} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-3 sm:grid-cols-6">
              <input value={r.name} onChange={(e) => upd(i, "name", e.target.value)} placeholder="Nome (500 ml)" aria-label="Nome da variante" className={`${input} col-span-2`} />
              <input value={r.price} onChange={(e) => upd(i, "price", e.target.value)} type="number" step="0.01" min="0" placeholder="Preço" aria-label="Preço" className={input} />
              <input value={r.compareAtPrice} onChange={(e) => upd(i, "compareAtPrice", e.target.value)} type="number" step="0.01" min="0" placeholder="Preço “de”" aria-label="Preço antigo" className={input} />
              <input value={r.sku} onChange={(e) => upd(i, "sku", e.target.value)} placeholder="SKU" aria-label="SKU" className={input} />
              {canStock
                ? <input value={r.stock} onChange={(e) => upd(i, "stock", e.target.value)} type="number" min="0" placeholder="Estoque" aria-label="Estoque" className={input} />
                : <span className="self-center text-xs text-ink/45">estoque: só o dono</span>}
              {rows.length > 1 && <button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="col-span-2 text-left text-xs text-red-700 underline sm:col-span-6">remover variante</button>}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRows((r) => [...r, blank()])} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-paper">+ Adicionar variante</button>
      </section>

      <div className="flex gap-3">
        <button className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-ink hover:brightness-110">Salvar produto</button>
        <Link href="/painel/produtos" className="rounded-lg border border-line px-5 py-2.5 text-sm hover:bg-paper">Cancelar</Link>
      </div>
    </form>
  );
}
