"use client";

import Image from "next/image";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import bannerImage from "@/resources/Banner0.png";
import Nav from "./Nav";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {/* Site-wide banner */}
      <div className="w-full bg-zinc-950">
        <Image
          src={bannerImage}
          alt="Another Chess"
          priority
          style={{ width: "100%", height: "auto" }}
        />
      </div>
      {/* Sticky nav sits below the banner */}
      <Nav />
      {children}
    </SessionProvider>
  );
}
