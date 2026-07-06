"use client";

import Image from "next/image";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import bannerImage from "@/resources/banner2.png";
import Nav from "./Nav";
import PreferenceSync from "./PreferenceSync";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {/* Banner — 56px on mobile, 100px on desktop */}
      <div className="relative w-full sticky top-0 z-50 bg-zinc-950 h-14 md:h-[100px]">
        <Image
          src={bannerImage}
          alt="Mad Chess Lab"
          priority
          fill
          style={{ objectFit: "cover", objectPosition: "center" }}
        />
      </div>
      {/* Sidebar + page content */}
      <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-100px)] overflow-hidden">
        <Nav />
        {/* pb-14 on mobile leaves room above the fixed bottom nav bar */}
        <div className="flex-1 min-w-0 overflow-y-auto pb-14 md:pb-0">{children}</div>
      </div>
      <PreferenceSync />
    </SessionProvider>
  );
}
