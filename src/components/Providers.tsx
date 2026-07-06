"use client";

import Image from "next/image";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import bannerImage from "@/resources/Banner2.png";
import Nav from "./Nav";
import PreferenceSync from "./PreferenceSync";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {/* Banner — sticks at top so sidebar offset stays correct while scrolling */}
      <div className="relative w-full sticky top-0 z-50 bg-zinc-950" style={{ height: "100px" }}>
        <Image
          src={bannerImage}
          alt="Mad Chess Lab"
          priority
          fill
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      </div>
      {/* Sidebar + page content */}
      <div className="flex h-[calc(100vh-100px)] overflow-hidden">
        <Nav />
        <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
      </div>
      <PreferenceSync />
    </SessionProvider>
  );
}
