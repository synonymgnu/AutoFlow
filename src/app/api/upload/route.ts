import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { checkStoreRole } from "@/lib/permissions";

export const runtime = "nodejs";
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX = 4 * 1024 * 1024; // a Vercel limita o corpo da requisição a ~4,5 MB
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  if (!(await checkStoreRole("MANAGER"))) return err("Sem permissão.", 403);
  const cloud = process.env.CLOUDINARY_CLOUD_NAME, key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return err("Cloudinary não configurado no .env.", 500);

  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return err("Nenhum arquivo enviado.", 400);
  if (!TYPES.includes(file.type)) return err("Use imagens JPG, PNG ou WebP.", 400);
  if (file.size > MAX) return err("A imagem passa de 4 MB.", 400);

  const timestamp = String(Math.floor(Date.now() / 1000)), folder = "loja";
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
  const body = new FormData();
  body.append("file", file); body.append("api_key", key); body.append("timestamp", timestamp);
  body.append("folder", folder); body.append("signature", signature);

  let r: Response;
  try {
    r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body });
  } catch (e) {
    console.error("[upload] sem conexão com o Cloudinary:", e);
    return err("Sem conexão com o Cloudinary (verifique a internet do servidor).", 502);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.secure_url) {
    // mensagem real do Cloudinary (ex.: "Invalid Signature", "Invalid cloud_name"); só vai para quem tem permissão de gerente
    console.error("[upload] Cloudinary respondeu", r.status, j);
    return err(`Cloudinary: ${j?.error?.message ?? `erro ${r.status}`}`, 502);
  }
  // f_auto,q_auto: formato e qualidade otimizados na entrega
  return NextResponse.json({ url: String(j.secure_url).replace("/upload/", "/upload/f_auto,q_auto/") });
}
