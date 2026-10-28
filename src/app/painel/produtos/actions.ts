"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStoreRole } from "@/lib/permissions";

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const opt = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().positive().optional());

const variant = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Toda variante precisa de um nome (ex.: 500 ml)."),
  price: z.coerce.number().positive("Informe o preço de cada variante."),
  compareAtPrice: opt,
  sku: z.string().trim().optional(),
  stock: z.coerce.number().int().min(0).default(0),
});
const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome do produto."),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(["DRAFT", "ACTIVE"]),
  images: z.array(z.string().refine((u) => /^(https?:\/\/|\/)/.test(u), "Imagem inválida: use um link http(s) ou um caminho começando com /.")).max(8),
  variants: z.array(variant).min(1, "Cadastre ao menos uma variante.").max(20),
});

export async function saveProduct(fd: FormData) {
  const { store, role } = await requireStoreRole("MANAGER");
  let variants: unknown = [];
  try { variants = JSON.parse(String(fd.get("variants") ?? "[]")); } catch {}
  const parsed = schema.safeParse({
    id: fd.get("id") || undefined, name: fd.get("name"), brandId: fd.get("brandId") || undefined, categoryId: fd.get("categoryId") || undefined,
    description: fd.get("description") || undefined, status: fd.get("status"),
    images: String(fd.get("images") ?? "").split("\n").map((s) => s.trim()).filter(Boolean), variants,
  });
  const base = parsed.success && parsed.data.id ? `/painel/produtos/${parsed.data.id}` : "/painel/produtos/novo";
  function fail(m: string): never { redirect(`${base}?erro=${encodeURIComponent(m)}`); }
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const d = parsed.data;
  if (d.brandId && !(await prisma.brand.findFirst({ where: { id: d.brandId, storeId: store.id } }))) fail("Marca inválida.");
  if (d.categoryId && !(await prisma.category.findFirst({ where: { id: d.categoryId, storeId: store.id } }))) fail("Categoria inválida.");
  const owner = role === "OWNER"; // estoque só é gravado pelo dono
  const main = { name: d.name, brandId: d.brandId ?? null, categoryId: d.categoryId ?? null, description: d.description ?? null, status: d.status, images: d.images, imageUrl: d.images[0] ?? null };
  const vdata = (v: (typeof d.variants)[number]) => ({ name: v.name, price: v.price, compareAtPrice: v.compareAtPrice ?? null, sku: v.sku || null });

  try {
    if (!d.id) {
      await prisma.product.create({
        data: { storeId: store.id, slug: `${slugify(d.name)}-${Date.now().toString(36)}`, ...main,
          variants: { create: d.variants.map((v) => ({ ...vdata(v), stock: owner ? v.stock : 0 })) } },
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const p = await tx.product.findFirst({ where: { id: d.id, storeId: store.id }, include: { variants: true } });
        if (!p) throw new Error("not found");
        await tx.product.update({ where: { id: p.id }, data: main });
        const keep = d.variants.map((v) => v.id).filter((x): x is string => Boolean(x));
        await tx.productVariant.deleteMany({ where: { productId: p.id, id: { notIn: keep } } });
        for (const v of d.variants) {
          if (v.id && p.variants.some((x) => x.id === v.id)) {
            await tx.productVariant.update({ where: { id: v.id }, data: { ...vdata(v), ...(owner ? { stock: v.stock } : {}) } });
          } else {
            await tx.productVariant.create({ data: { ...vdata(v), productId: p.id, stock: owner ? v.stock : 0 } });
          }
        }
      });
    }
  } catch {
    fail("Não foi possível salvar o produto.");
  }
  revalidatePath("/painel/produtos");
  revalidatePath("/");
  redirect("/painel/produtos");
}

export async function alternarStatus(fd: FormData) {
  const { store } = await requireStoreRole("MANAGER");
  const id = String(fd.get("id"));
  const p = await prisma.product.findFirst({ where: { id, storeId: store.id } });
  if (!p) return;
  await prisma.product.update({ where: { id }, data: { status: p.status === "ACTIVE" ? "DRAFT" : "ACTIVE" } });
  revalidatePath("/painel/produtos");
  revalidatePath("/");
}

export async function criarMarca(fd: FormData) {
  const { store } = await requireStoreRole("MANAGER");
  const d = z.object({ name: z.string().trim().min(2), logoUrl: z.string().trim().refine((u) => u === "" || /^(https?:\/\/|\/)/.test(u)) }).safeParse(Object.fromEntries(fd));
  if (!d.success) redirect("/painel/marcas?erro=Confira%20o%20nome%20e%20o%20link%20da%20logo.");
  try {
    await prisma.brand.create({ data: { storeId: store.id, name: d.data.name, slug: slugify(d.data.name), logoUrl: d.data.logoUrl || null } });
  } catch {
    redirect("/painel/marcas?erro=Essa%20marca%20j%C3%A1%20existe.");
  }
  revalidatePath("/painel/marcas");
  redirect("/painel/marcas");
}

export async function excluirMarca(fd: FormData) {
  const { store } = await requireStoreRole("MANAGER");
  await prisma.brand.deleteMany({ where: { id: String(fd.get("id")), storeId: store.id } });
  revalidatePath("/painel/marcas");
}

export async function criarCategoria(fd: FormData) {
  const { store } = await requireStoreRole("MANAGER");
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) redirect("/painel/categorias?erro=Informe%20o%20nome.");
  try {
    await prisma.category.create({ data: { storeId: store.id, name, slug: slugify(name) } });
  } catch {
    redirect("/painel/categorias?erro=Essa%20categoria%20j%C3%A1%20existe.");
  }
  revalidatePath("/painel/categorias");
  redirect("/painel/categorias");
}

export async function excluirCategoria(fd: FormData) {
  const { store } = await requireStoreRole("MANAGER");
  await prisma.category.deleteMany({ where: { id: String(fd.get("id")), storeId: store.id } });
  revalidatePath("/painel/categorias");
  revalidatePath("/");
}
