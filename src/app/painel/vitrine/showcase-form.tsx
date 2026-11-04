"use client";
import { useActionState, useMemo, useState } from "react";
import { brl } from "@/lib/format";
import { saveShowcase, type ShowcaseState } from "./actions";

export type SectionKey = "OFFERS" | "FEATURED";
export type Mode = "AUTOMATIC" | "MANUAL" | "MIXED";

export type SectionDraft = {
  key: SectionKey;
  enabled: boolean;
  mode: Mode;
  title: string;
  subtitle: string;
  maxItems: string; // string para deixar o campo ser apagado enquanto digita
  productIds: string[];
};

export type PickerProduct = {
  id: string;
  name: string;
  brand: string | null;
  image: string | null;
  price: number | null;
  onSale: boolean;
  /** null = aparece na loja; senão, o motivo de não aparecer */
  blockedReason: string | null;
};

const META: Record<SectionKey, { label: string; autoHelp: string; placeholder: string }> = {
  OFFERS: {
    label: "Ofertas especiais",
    autoHelp: "Automático: aparecem os produtos com preço promocional (“De … por …”).",
    placeholder: "Ofertas especiais",
  },
  FEATURED: {
    label: "Produtos em destaque",
    autoHelp: "Automático: aparecem os produtos publicados mais recentes.",
    placeholder: "Produtos em destaque",
  },
};

const MODES: { value: Mode; label: string; help: string }[] = [
  { value: "AUTOMATIC", label: "Automático", help: "O sistema escolhe os produtos." },
  { value: "MANUAL", label: "Manual", help: "Aparecem só os que você escolher." },
  { value: "MIXED", label: "Misto", help: "Os seus primeiro; o sistema completa o resto." },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand";
const iconBtn =
  "rounded-lg border border-line px-2.5 py-1.5 text-xs hover:bg-paper disabled:opacity-40 disabled:hover:bg-transparent";

export function ShowcaseForm({
  initial,
  products,
}: {
  initial: SectionDraft[];
  products: PickerProduct[];
}) {
  const [sections, setSections] = useState(initial);
  const [state, formAction, pending] = useActionState<ShowcaseState, FormData>(saveShowcase, {});
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const patch = (key: SectionKey, change: Partial<SectionDraft>) =>
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...change } : s)));

  const payload = JSON.stringify(sections.map((s) => ({ ...s, maxItems: Number(s.maxItems) })));

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <input type="hidden" name="payload" value={payload} />

      {sections.map((s) => (
        <SectionEditor
          key={s.key}
          section={s}
          products={products}
          byId={byId}
          onChange={(change) => patch(s.key, change)}
        />
      ))}

      <div className="sticky bottom-[4.5rem] z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-3 shadow-lg md:bottom-4">
        <div className="min-w-0 text-sm" role="status" aria-live="polite">
          {state.error && <p className="text-red-700">{state.error}</p>}
          {state.ok && !state.error && (
            <p className="text-ok">
              Vitrine salva.{" "}
              <a href="/" target="_blank" className="underline underline-offset-2">
                Ver na loja
              </a>
            </p>
          )}
        </div>
        <button
          disabled={pending}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-ink hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar vitrine"}
        </button>
      </div>
    </form>
  );
}

function SectionEditor({
  section: s,
  products,
  byId,
  onChange,
}: {
  section: SectionDraft;
  products: PickerProduct[];
  byId: Map<string, PickerProduct>;
  onChange: (change: Partial<SectionDraft>) => void;
}) {
  const [query, setQuery] = useState("");
  const meta = META[s.key];
  const usesManual = s.mode !== "AUTOMATIC";
  const limit = parseInt(s.maxItems, 10);
  const hasLimit = limit >= 1;

  // Mesma regra da loja: produto indisponível é pulado e o limite conta só os visíveis.
  const rows = useMemo(() => {
    let shown = 0;
    return s.productIds.map((id) => {
      const p = byId.get(id);
      const blocked = p ? p.blockedReason : "Produto não encontrado";
      const visible = !blocked && (!hasLimit || shown < limit);
      if (!blocked) shown++;
      return { id, p, blocked, visible };
    });
  }, [s.productIds, byId, hasLimit, limit]);
  const visibleCount = rows.filter((r) => r.visible).length;

  const results = useMemo(() => {
    const q = norm(query.trim());
    return products
      .filter(
        (p) =>
          !p.blockedReason &&
          !s.productIds.includes(p.id) &&
          (!q || norm(`${p.name} ${p.brand ?? ""}`).includes(q))
      )
      .slice(0, 40);
  }, [products, s.productIds, query]);

  const add = (id: string) => onChange({ productIds: [...s.productIds, id] });
  const remove = (id: string) => onChange({ productIds: s.productIds.filter((x) => x !== id) });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= s.productIds.length) return;
    const next = [...s.productIds];
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ productIds: next });
  };

  return (
    <section className="space-y-5 rounded-xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{meta.label}</h2>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          Mostrar na loja
        </label>
      </div>

      {!s.enabled && (
        <p className="rounded-lg bg-paper p-3 text-sm text-ink/70">
          Esta seção está oculta na página inicial. Você pode configurar agora e ativar depois.
        </p>
      )}

      <div className={s.enabled ? "space-y-5" : "space-y-5 opacity-60"}>
        {/* Modo de exibição */}
        <fieldset>
          <legend className="text-sm font-medium">Modo de exibição</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {MODES.map((m) => (
              <label
                key={m.value}
                className={`cursor-pointer rounded-lg border p-3 text-sm ${
                  s.mode === m.value
                    ? "border-brand bg-brand/10"
                    : "border-line hover:bg-paper"
                }`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name={`mode-${s.key}`}
                    checked={s.mode === m.value}
                    onChange={() => onChange({ mode: m.value })}
                  />
                  {m.label}
                </span>
                <span className="mt-1 block text-xs text-ink/60">{m.help}</span>
              </label>
            ))}
          </div>
          {s.mode !== "MANUAL" && <p className="mt-2 text-xs text-ink/60">{meta.autoHelp}</p>}
        </fieldset>

        {/* Textos e quantidade */}
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <label className="block text-sm font-medium">
            Título
            <input
              value={s.title}
              onChange={(e) => onChange({ title: e.target.value })}
              maxLength={80}
              placeholder={meta.placeholder}
              className={`${input} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium">
            Máx. de produtos
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={24}
              value={s.maxItems}
              onChange={(e) => onChange({ maxItems: e.target.value })}
              className={`${input} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Subtítulo <span className="font-normal text-ink/50">(opcional)</span>
            <input
              value={s.subtitle}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              maxLength={160}
              className={`${input} mt-1`}
            />
          </label>
        </div>

        <div className="rounded-lg bg-paper p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink/50">
            Prévia do cabeçalho
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight">{s.title.trim() || "—"}</p>
          {s.subtitle.trim() && <p className="mt-0.5 text-sm text-ink/55">{s.subtitle}</p>}
        </div>

        {/* Seleção manual */}
        {usesManual ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium">Produtos escolhidos</h3>
              <p className="text-xs text-ink/60">
                {s.productIds.length} escolhido{s.productIds.length === 1 ? "" : "s"} ·{" "}
                {visibleCount} aparece{visibleCount === 1 ? "" : "m"} na loja
                {s.mode === "MIXED" && hasLimit && visibleCount < limit
                  ? `; o sistema completa até ${limit}`
                  : ""}
              </p>
            </div>

            {rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-ink/60">
                Nenhum produto escolhido ainda. Use a busca abaixo para adicionar.
              </p>
            ) : (
              <ol className="divide-y divide-line rounded-lg border border-line">
                {rows.map((r, i) => (
                  <li
                    key={r.id}
                    className={`flex items-center gap-3 p-2.5 ${!r.visible ? "bg-paper/60" : ""}`}
                  >
                    <span className="w-5 shrink-0 text-center text-xs text-ink/50">{i + 1}</span>
                    <Thumb src={r.p?.image ?? null} dim={!r.visible} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${!r.visible ? "text-ink/60" : ""}`}>
                        {r.p?.name ?? "Produto removido"}
                      </p>
                      <p className="truncate text-xs text-ink/55">
                        {r.p?.brand ?? "Sem marca"}
                        {r.p?.price != null && <> · {brl(r.p.price)}</>}
                        {r.p?.onSale && <span className="ml-1 text-ok">· em oferta</span>}
                      </p>
                      {r.blocked ? (
                        <p className="text-xs text-warn">Não aparece na loja: {r.blocked.toLowerCase()}.</p>
                      ) : !r.visible ? (
                        <p className="text-xs text-warn">Fora do limite de {limit} — não aparece.</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className={iconBtn}
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={`Subir ${r.p?.name ?? "produto"}`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={iconBtn}
                        disabled={i === rows.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={`Descer ${r.p?.name ?? "produto"}`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50"
                        onClick={() => remove(r.id)}
                        aria-label={`Remover ${r.p?.name ?? "produto"}`}
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div>
              <label className="block text-sm font-medium">
                Adicionar produtos
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome ou marca"
                  className={`${input} mt-1`}
                />
              </label>
              <ul className="mt-2 max-h-64 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                {results.length === 0 && (
                  <li className="p-4 text-center text-sm text-ink/60">
                    {query ? "Nenhum produto encontrado." : "Todos os produtos disponíveis já foram adicionados."}
                  </li>
                )}
                {results.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 p-2.5">
                    <Thumb src={p.image} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-ink/55">
                        {p.brand ?? "Sem marca"}
                        {p.price != null && <> · {brl(p.price)}</>}
                        {p.onSale && <span className="ml-1 text-ok">· em oferta</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => add(p.id)}
                      className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-paper"
                    >
                      + Adicionar
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs text-ink/50">
                Só aparecem produtos publicados e com estoque.
                {s.key === "OFFERS" && " Produtos sem preço promocional entram como “Selecionado”, sem selo de desconto."}
              </p>
            </div>
          </div>
        ) : (
          s.productIds.length > 0 && (
            <p className="rounded-lg bg-paper p-3 text-xs text-ink/70">
              Sua seleção manual ({s.productIds.length}) está guardada e volta a valer se você mudar
              para Manual ou Misto.
            </p>
          )
        )}
      </div>
    </section>
  );
}

function Thumb({ src, dim }: { src: string | null; dim?: boolean }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`h-12 w-12 shrink-0 rounded border border-line object-cover ${dim ? "opacity-50" : ""}`}
    />
  ) : (
    <div className="h-12 w-12 shrink-0 rounded bg-paper" />
  );
}
