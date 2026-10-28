import Image from "next/image";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { CartButton } from "./cart-ui";

export async function StoreHeader() {
  const [store, session] = await Promise.all([getCurrentStore(), auth()]);
  const isStaff = session?.user?.id
    ? Boolean(await prisma.storeMember.findUnique({ where: { storeId_userId: { storeId: store.id, userId: session.user.id } } }))
    : false;
  const first = (session?.user?.name ?? session?.user?.email ?? "").split(/[ @]/)[0];
  return (
    <header className="sticky top-0 z-30 border-b border-brand/25 bg-ink/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-2">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt={store.name} width={48} height={48} priority className="h-12 w-12" />
          <span className="hidden text-lg font-bold tracking-tight sm:inline">{store.name}</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {session?.user ? (
            <>
              <span className="hidden max-w-[10rem] truncate text-white/70 sm:inline">Bem-vindo, <b className="text-brand">{first}</b></span>
              {isStaff && <Link href="/painel" className="rounded-full bg-brand px-3 py-1.5 font-medium text-ink hover:brightness-110">Painel</Link>}
              <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                <button className="text-white/70 underline-offset-2 hover:text-white hover:underline">Sair</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="text-white/70 underline-offset-2 hover:text-white hover:underline">Entrar</Link>
          )}
          <CartButton />
        </div>
      </div>
    </header>
  );
}
