export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">About MadChessLab</h1>
      <p className="mb-8 text-zinc-400">A playground for chess variants.</p>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">What is this?</h2>
        <p className="leading-relaxed text-zinc-300">
          MadChessLab is a web app for playing chess variants against a friend on the same
          device, against a built-in computer opponent, or online against another player in
          real time. It ships with three rule sets and is built to make adding more straightforward.
        </p>
        <br/>
        <p>
          Now lttle bit about me.
          I&apos;m Neil Mathur, and I learned to play chess from my uncle in India when I was 6 years old. While I started playing just for fun, it quickly grew to become a dedicated hobby. I always have fun playing with friends at school and helping them advance. As a solid, tactical player, I&apos;ve grown to enjoy complex chess puzzles and compositions, and I love using them to help train students. Whether over the board, or online, I always like learning from my mistakes to become a stronger player.
        </p>
        <br/>
        <a href="https://www.chess.com/member/thatelodoner" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          Chess.com Profile
        </a>
        <br/>
        <a href="https://ratings.uschess.org/player/30707858" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          US Chess Rating
        </a>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Variants</h2>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h3 className="mb-1 font-semibold">Standard Chess</h3>
            <p className="text-sm text-zinc-400">
              Not really a variant but Classic chess. Each side moves once per turn. Win by checkmate; draw by stalemate.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h3 className="mb-1 font-semibold">Monster King Chess</h3>
            <p className="text-sm text-zinc-400">
              Black has only a king and three pawns, but moves <em>twice</em> per turn. There is
              no check — you win by capturing the enemy king outright.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <h3 className="mb-1 font-semibold">Crazyhouse</h3>
            <p className="text-sm text-zinc-400">
              Captured pieces switch sides. Instead of a regular move you can
              drop any piece you have captured onto an empty square. Standard chess rules
              otherwise apply.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Features</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-zinc-400">
          <li>Built-in computer opponent (alpha-beta AI, three difficulty levels)</li>
          <li>Each side can be set to Human or Computer independently</li>
          <li>Board and piece skins</li>
          <li>Sign in with Google to sync your preferences across devices</li>
          <li>Optional online multiplayer — create a room and share the code</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Tech</h2>
        <p className="text-sm text-zinc-400">
          Built with Next.js 15, TypeScript, Tailwind CSS, Zustand, and a custom
          pure-TypeScript chess engine. The AI runs in a Web Worker so the UI stays
          responsive while the computer thinks. Online play uses Socket.IO with
          server-side move validation.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Feedback</h2>
        <div className="flex justify-center">
          <iframe
            src="https://docs.google.com/forms/d/e/1FAIpQLSeZMd8MCvx6h7UCOWPCNGVkXJadBTY8IJ3AEb05lUtUFKwdeg/viewform?embedded=true"
            width="700"
            height="520"
            className="max-w-full border-0"
            title="Feedback form"
          >
            Loading…
          </iframe>
        </div>
      </section>
    </main>
  );
}
