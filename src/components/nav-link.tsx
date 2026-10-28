"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/painel" ? path === href : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "bg-brand font-medium text-ink" : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
