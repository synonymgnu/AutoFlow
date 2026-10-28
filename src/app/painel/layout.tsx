import Image from "next/image";
import { requireStoreRole } from "@/lib/permissions";
import { signOut } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { store, user, role } = await requireStoreRole("STAFF");
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="bg-ink px-4 py-4 text-white md:flex md:flex-col md:py-6">
        <div className="flex items-center gap-2 px-1"><Image src="/logo.png" alt="" width={44} height={44} className="h-11 w-11" /><p className="text-lg font-bold tracking-tight">{store.name}</p></div>
        <p className="px-3 text-xs text-white/50">Painel da loja</p>
        <nav className="mt-4 flex gap-1 overflow-x-auto md:flex-col">
          <NavLink href="/painel">Resumo</NavLink>
          <NavLink href="/painel/pedidos">Pedidos</NavLink>
          <NavLink href="/painel/produtos">Produtos</NavLink>
          <NavLink href="/painel/marcas">Marcas</NavLink>
          <NavLink href="/painel/categorias">Categorias</NavLink>
          {role === "OWNER" && <NavLink href="/painel/configuracoes">Configurações</NavLink>}
          <a href="/" target="_blank" className="rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
            Ver a loja
          </a>
        </nav>
        <form className="mt-4 px-3 md:mt-auto" action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <p className="truncate text-xs text-white/50">{user.email}</p>
          <button className="mt-1 text-sm text-white/80 underline-offset-2 hover:underline">Sair</button>
        </form>
      </aside>
      <div className="mx-auto w-full max-w-5xl p-5 md:p-8">{children}</div>
    </div>
  );
}
