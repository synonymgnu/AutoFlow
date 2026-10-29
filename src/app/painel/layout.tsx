import Image from "next/image";
import { requireStoreRole } from "@/lib/permissions";
import { signOut } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";
import { BottomNav } from "@/components/painel/bottom-nav";

type L = [string, string];

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { store, user, role } = await requireStoreRole("STAFF");
  const main: L[] = [["/painel", "Resumo"], ["/painel/pedidos", "Pedidos"], ["/painel/produtos", "Produtos"], ...(role !== "STAFF" ? [["/painel/relatorios", "Relatórios"] as L] : [])];
  const more: L[] = [["/painel/marcas", "Marcas"], ["/painel/categorias", "Categorias"], ...(role === "OWNER" ? [["/painel/configuracoes", "Configurações"] as L] : []), ["/", "Ver a loja"]];
  const out = async () => { "use server"; await signOut({ redirectTo: "/login" }); };
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden bg-ink px-4 py-6 text-white md:flex md:flex-col">
        <div className="flex items-center gap-2 px-1"><Image src="/logo.png" alt="" width={44} height={44} className="h-11 w-11" /><p className="text-lg font-bold tracking-tight">{store.name}</p></div>
        <nav className="mt-4 flex flex-col gap-1">
          {[...main, ...more.filter(([h]) => h !== "/")].map(([h, l]) => <NavLink key={h} href={h}>{l}</NavLink>)}
          <a href="/" target="_blank" className="rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">Ver a loja</a>
        </nav>
        <form className="mt-auto px-3" action={out}>
          <p className="truncate text-xs text-white/50">{user.email}</p>
          <button className="mt-1 text-sm text-white/80 underline-offset-2 hover:underline">Sair</button>
        </form>
      </aside>
      <header className="flex items-center justify-between bg-ink px-4 py-2 text-white md:hidden">
        <div className="flex items-center gap-2"><Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9" /><span className="font-bold">{store.name}</span></div>
        <form action={out}><button className="text-sm text-white/80">Sair</button></form>
      </header>
      <div className="mx-auto w-full max-w-5xl p-4 pb-24 md:p-8">{children}</div>
      <BottomNav main={main} more={more} />
    </div>
  );
}
