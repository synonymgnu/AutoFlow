import Image from "next/image";
import { signIn } from "@/lib/auth";
import { getCurrentStore } from "@/lib/store";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const { error, callbackUrl } = await searchParams;
  const store = await getCurrentStore();
  // só aceita caminho interno (evita redirecionar para outro site)
  const next = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink p-5">
      <Image src="/logo.png" alt="" width={140} height={140} priority className="h-36 w-36" />
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Entrar</h1>
          <p className="text-sm text-ink/60">{next === "/checkout" ? "Entre para finalizar sua compra." : store.name}</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Não foi possível entrar. Tente novamente.</p>}
        <form action={async () => { "use server"; await signIn("google", { redirectTo: next }); }}>
          <button className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-ink hover:brightness-110">Entrar com Google</button>
        </form>
        <p className="text-center text-xs text-ink/45">ou</p>
        <form className="space-y-2" action={async (fd: FormData) => { "use server"; await signIn("resend", { email: fd.get("email"), redirectTo: next }); }}>
          <input name="email" type="email" required placeholder="seu@email.com" className="w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-brand" />
          <button className="w-full rounded-lg border border-ink px-4 py-2.5 text-sm font-medium hover:bg-paper">Receber link por e-mail</button>
        </form>
      </div>
    </main>
  );
}
