"use client";

import { useEffect, useState } from "react";
import {
  getProviders,
  signIn,
  signOut,
  useSession,
} from "next-auth/react";

type Providers = Awaited<ReturnType<typeof getProviders>>;

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [providers, setProviders] = useState<Providers>(null);

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  if (status === "loading") {
    return <span className="text-sm text-zinc-500">…</span>;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        {session.user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="h-7 w-7 rounded-full"
          />
        )}
        <span className="text-zinc-300">
          {session.user.name ?? session.user.email}
        </span>
        <button className="btn" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {providers ? (
        Object.values(providers).map((p) => (
          <button key={p.id} className="btn" onClick={() => signIn(p.id)}>
            {p.type === "credentials" ? p.name : `Sign in with ${p.name}`}
          </button>
        ))
      ) : (
        <span className="text-sm text-zinc-500">…</span>
      )}
    </div>
  );
}
