"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AuthButton from "./AuthButton";

export default function Nav() {
  const pathname = usePathname();
  const isOnline = pathname.startsWith("/lobby") || pathname.startsWith("/play/");

  const links = (
    <>
      <NavLink href="/" active={pathname === "/"}>Home</NavLink>
      {process.env.NEXT_PUBLIC_MULTIPLAYER === "true" && (
        isOnline
          ? <NavLink href="/" active={false}>⇄ Play Local</NavLink>
          : <NavLink href="/lobby" active={isOnline}>⇄ Play Online</NavLink>
      )}
      <NavLink href="/about" active={pathname === "/about"}>About</NavLink>
      <NavLink href="/settings" active={pathname === "/settings"}>Settings</NavLink>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ─────────────────── */}
      <nav className="hidden md:flex sticky top-[100px] z-40 h-[calc(100vh-100px)] w-48 shrink-0 self-start border-r border-zinc-800 bg-zinc-950 flex-col px-3 py-4">
        <div className="flex flex-col gap-0.5 text-sm">
          {links}
        </div>
        <div className="flex-1" />
        <AuthButton />
      </nav>

      {/* ── Mobile bottom bar (hidden on desktop) ──────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm h-14 px-2">
        <MobileNavLink href="/" active={pathname === "/"}>Home</MobileNavLink>
        <MobileNavLink href="/about" active={pathname === "/about"}>About</MobileNavLink>
        <MobileNavLink href="/settings" active={pathname === "/settings"}>Settings</MobileNavLink>
        <div className="text-xs">
          <AuthButton />
        </div>
      </nav>
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`block rounded px-2 py-1.5 text-sm transition-colors ${
        active
          ? "bg-zinc-800 font-semibold text-white"
          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center px-3 py-1 text-xs transition-colors ${
        active ? "font-semibold text-white" : "text-zinc-400"
      }`}
    >
      {children}
    </Link>
  );
}
