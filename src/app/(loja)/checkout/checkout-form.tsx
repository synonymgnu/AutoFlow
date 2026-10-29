"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/format";
import { buscarCep, finalizarPedido } from "./actions";

type Settings = { deliveryEnabled: boolean; pickupEnabled: boolean; deliveryFee: number; minimumOrderValue: number; pickupAddress: string | null };
type Initial = { name: string; phone: string; cep: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string };

const maskCep = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

export function CheckoutForm({ settings, initial, onlineEnabled }: { settings: Settings; initial: Initial; onlineEnabled: boolean }) {
  const { items, total, clear } = useCart();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState("");
  const [mode, setMode] = useState<"DELIVERY" | "PICKUP">(settings.pickupEnabled ? "PICKUP" : "DELIVERY");
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [addr, setAddr] = useState({ ...initial, cep: maskCep(initial.cep) });
  const [buscando, setBuscando] = useState(false);
  const [cepMsg, setCepMsg] = useState("");
  const [pay, setPay] = useState<"ONLINE" | "WHATSAPP">(onlineEnabled ? "ONLINE" : "WHATSAPP");
  const fee = mode === "DELIVERY" ? settings.deliveryFee : 0;
  const input = "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm focus:border-brand";
  const set = (k: keyof typeof addr) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));

  async function lookup(cep: string) {
    setBuscando(true); setCepMsg("");
    const r = await buscarCep(cep);
    setBuscando(false);
    if (r.ok) setAddr((a) => ({ ...a, street: r.street, neighborhood: r.neighborhood, city: r.city, state: r.state }));
    else setCepMsg(r.error);
  }
  function onCep(e: React.ChangeEvent<HTMLInputElement>) {
    const v = maskCep(e.target.value);
    setAddr((a) => ({ ...a, cep: v }));
    if (v.length === 9) lookup(v); // busca sozinho ao completar 8 dígitos
  }

  if (items.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-line bg-white p-8 text-center text-ink/60">
        Seu carrinho está vazio. <Link href="/" className="text-brand-dark underline">Voltar à loja</Link>
      </p>
    );
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const notes = String(new FormData(e.currentTarget).get("notes") || "") || undefined;
    setErro("");
    start(async () => {
      const r = await finalizarPedido({
        name, phone, fulfillment: mode, payment: pay, notes,
        address: mode === "DELIVERY" ? { cep: addr.cep, street: addr.street, number: addr.number, complement: addr.complement || undefined, neighborhood: addr.neighborhood, city: addr.city, state: addr.state } : undefined,
        items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
      });
      if (r.ok) { clear(); if (r.external) window.location.href = r.url; else router.push(r.url); } else setErro(r.error);
    });
  }

  const tab = (on: boolean) => `rounded-lg border px-3 py-2 text-sm font-medium ${on ? "border-brand bg-brand text-ink" : "border-line hover:bg-paper"}`;
  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <section className="space-y-3 rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">Seus dados</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nome" className={input} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="WhatsApp com DDD" className={input} />
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">Recebimento</h2>
        <div className="grid grid-cols-2 gap-2">
          {settings.pickupEnabled && <button type="button" onClick={() => setMode("PICKUP")} className={tab(mode === "PICKUP")}>Retirar na loja</button>}
          {settings.deliveryEnabled && <button type="button" onClick={() => setMode("DELIVERY")} className={tab(mode === "DELIVERY")}>Entrega</button>}
        </div>
        {mode === "PICKUP" && settings.pickupAddress && <p className="text-sm text-ink/70">Retirada em: {settings.pickupAddress}</p>}
        {mode === "DELIVERY" && (
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-6 sm:col-span-3">
              <input value={addr.cep} onChange={onCep} required inputMode="numeric" placeholder="CEP" aria-label="CEP" className={input} />
            </div>
            <div className="col-span-6 flex items-center text-sm text-ink/60 sm:col-span-3">
              {buscando ? "Buscando endereço..." : cepMsg ? <span className="text-red-700">{cepMsg}</span> : "Digite o CEP e preenchemos o resto."}
            </div>
            <input value={addr.street} onChange={set("street")} required placeholder="Rua" aria-label="Rua" className={`${input} col-span-6 sm:col-span-4`} />
            <input value={addr.number} onChange={set("number")} required placeholder="Número" aria-label="Número" className={`${input} col-span-3 sm:col-span-2`} />
            <input value={addr.complement} onChange={set("complement")} placeholder="Complemento" aria-label="Complemento" className={`${input} col-span-3 sm:col-span-2`} />
            <input value={addr.neighborhood} onChange={set("neighborhood")} required placeholder="Bairro" aria-label="Bairro" className={`${input} col-span-6 sm:col-span-4`} />
            <input value={addr.city} onChange={set("city")} required placeholder="Cidade" aria-label="Cidade" className={`${input} col-span-4 sm:col-span-4`} />
            <input value={addr.state} onChange={(e) => setAddr((a) => ({ ...a, state: e.target.value.toUpperCase().slice(0, 2) }))} required placeholder="UF" aria-label="UF" className={`${input} col-span-2`} />
          </div>
        )}
        <textarea name="notes" rows={2} placeholder="Observações (opcional)" className={input} />
      </section>

      {onlineEnabled && (
        <section className="space-y-3 rounded-xl border border-line bg-white p-5">
          <h2 className="font-semibold">Pagamento</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPay("ONLINE")} className={tab(pay === "ONLINE")}>Pix ou cartão</button>
            <button type="button" onClick={() => setPay("WHATSAPP")} className={tab(pay === "WHATSAPP")}>Combinar no WhatsApp</button>
          </div>
          <p className="text-xs text-ink/55">{pay === "ONLINE" ? "Você paga agora em um ambiente seguro da InfinitePay." : "Enviamos o pedido pelo WhatsApp e combinamos o pagamento."}</p>
        </section>
      )}

      <section className="rounded-xl border border-line bg-white p-5 text-sm">
        {items.map((i) => <div key={i.variantId} className="flex justify-between py-0.5"><span>{i.qty}× {i.productName} ({i.variantName})</span><span>{brl(i.qty * i.price)}</span></div>)}
        <div className="mt-3 flex justify-between border-t border-line pt-3"><span>Frete</span><span>{fee ? brl(fee) : "Grátis"}</span></div>
        <div className="mt-1 flex justify-between text-base font-bold"><span>Total</span><span>{brl(total + fee)}</span></div>
        {settings.minimumOrderValue > 0 && <p className="mt-2 text-xs text-ink/55">Pedido mínimo: {brl(settings.minimumOrderValue)}</p>}
      </section>
      {erro && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60">
        {pending ? "Enviando..." : "Confirmar pedido"}
      </button>
    </form>
  );
}
