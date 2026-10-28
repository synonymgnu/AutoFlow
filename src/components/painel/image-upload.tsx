"use client";
import { useRef, useState } from "react";

async function send(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/upload", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Falha no envio.");
  return j.url as string;
}

// Envia as fotos ao Cloudinary e grava as URLs (uma por linha) num campo oculto do formulário.
export function ImageUploader({ name, initial, max = 8 }: { name: string; initial: string[]; max?: number }) {
  const [urls, setUrls] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, max - urls.length);
    setBusy(true); setErro("");
    const added: string[] = [];
    for (const f of files) {
      try { added.push(await send(f)); } catch (x) { setErro((x as Error).message); }
    }
    setUrls((u) => [...u, ...added]);
    setBusy(false);
    if (ref.current) ref.current.value = "";
  }
  const btn = "rounded bg-ink/80 px-1.5 py-0.5 text-[10px] text-white";
  return (
    <div>
      <input type="hidden" name={name} value={urls.join("\n")} />
      <div className="flex flex-wrap gap-3">
        {urls.map((u, i) => (
          <div key={u} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-24 w-24 rounded-lg border border-line object-cover" />
            {i === 0 && max > 1 && <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-ink">capa</span>}
            <div className="absolute bottom-1 right-1 flex gap-1">
              {i > 0 && <button type="button" className={btn} onClick={() => setUrls((x) => [u, ...x.filter((y) => y !== u)])}>capa</button>}
              <button type="button" className={btn} onClick={() => setUrls((x) => x.filter((y) => y !== u))}>remover</button>
            </div>
          </div>
        ))}
        {urls.length < max && (
          <button type="button" disabled={busy} onClick={() => ref.current?.click()}
            className="h-24 w-24 rounded-lg border-2 border-dashed border-line text-sm text-ink/60 hover:bg-paper disabled:opacity-60">
            {busy ? "Enviando..." : "+ Foto"}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} hidden onChange={pick} />
      {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
    </div>
  );
}
