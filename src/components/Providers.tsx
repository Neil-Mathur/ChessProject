"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import Nav from "./Nav";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Nav />
      {children}
    </SessionProvider>
  );
}
