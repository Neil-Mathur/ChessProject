import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "paritosh.mathur@gmail.com";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  const [users, accounts, sessions, preferences] = await Promise.all([
    prisma.user.findMany({ take: 100, orderBy: { id: "asc" } }),
    prisma.account.findMany({ take: 100, orderBy: { id: "asc" } }),
    prisma.session.findMany({ take: 100, orderBy: { id: "asc" } }),
    prisma.preferences.findMany({ take: 100, orderBy: { id: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-10">
      <h1 className="text-2xl font-bold">Admin — Database Viewer</h1>

      <Section title="User" count={users.length}>
        <Table
          headers={["id", "name", "email", "emailVerified", "image"]}
          rows={users.map((u) => [u.id, u.name, u.email, u.emailVerified?.toISOString() ?? null, u.image])}
        />
      </Section>

      <Section title="Account" count={accounts.length}>
        <Table
          headers={["id", "userId", "type", "provider", "providerAccountId", "expires_at", "scope"]}
          rows={accounts.map((a) => [a.id, a.userId, a.type, a.provider, a.providerAccountId, a.expires_at, a.scope])}
        />
      </Section>

      <Section title="Session" count={sessions.length}>
        <Table
          headers={["id", "sessionToken", "userId", "expires"]}
          rows={sessions.map((s) => [s.id, s.sessionToken, s.userId, s.expires.toISOString()])}
        />
      </Section>

      <Section title="Preferences" count={preferences.length}>
        <Table
          headers={["id", "userId", "variantId", "boardThemeId", "pieceSetId", "orientation", "aiWhite", "aiBlack", "aiDepth"]}
          rows={preferences.map((p) => [p.id, p.userId, p.variantId, p.boardThemeId, p.pieceSetId, p.orientation, String(p.aiWhite), String(p.aiBlack), String(p.aiDepth)])}
        />
      </Section>
    </main>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        {title} <span className="text-sm font-normal text-zinc-400">({count} rows)</span>
      </h2>
      {children}
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number | null | undefined)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-xs">
        <thead className="bg-zinc-900 text-zinc-400">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-4 text-center text-zinc-500">
                No rows
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-900/50">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-zinc-300 max-w-xs truncate" title={String(cell ?? "")}>
                    {cell == null ? <span className="text-zinc-600">null</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
