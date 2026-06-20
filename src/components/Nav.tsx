"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AuthButton from "./AuthButton";

export default function Nav() {
  const pathname = usePathname();
  const isOnline = pathname.startsWith("/lobby") || pathname.startsWith("/play/");

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        {/* Brand */}
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight text-white hover:text-zinc-300"
        >
          Another Chess
        </Link>

        {/* Links */}
        <div className="flex items-center gap-5 text-sm">
          <NavLink href="/" active={pathname === "/"}>
            Home
          </NavLink>
          <NavLink href="/about" active={pathname === "/about"}>
            About
          </NavLink>
          {process.env.NEXT_PUBLIC_MULTIPLAYER === "true" && (
            isOnline ? (
              <NavLink href="/" active={false}>
                ⇄ Play Local
              </NavLink>
            ) : (
              <NavLink href="/lobby" active={isOnline}>
                ⇄ Play Online
              </NavLink>
            )
          )}
        </div>

        {/* Push auth to the right */}
        <div className="flex-1" />
        <AuthButton />
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`transition-colors ${
        active
          ? "font-semibold text-white"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}
