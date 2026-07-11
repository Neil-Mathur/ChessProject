// Client for the Stockfish 18 WASM engine.
// The single-threaded build in /public/stockfish.js runs as a self-contained
// Web Worker when its URL hash is set to "#,worker".
// UCI commands are sent via postMessage; UCI output arrives via onmessage.

let worker: Worker | null = null;
let ready: Promise<void> | null = null;

// Pending search: resolve is called with the UCI move string once bestmove arrives.
let pendingResolve: ((move: string | null) => void) | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker("/stockfish.js#,worker");
    worker.onmessage = (e: MessageEvent<string>) => {
      const line: string = typeof e.data === "string" ? e.data : String(e.data);
      if (line.startsWith("bestmove") && pendingResolve) {
        const parts = line.split(" ");
        const move = parts[1];
        const resolve = pendingResolve;
        pendingResolve = null;
        resolve(move === "(none)" ? null : move);
      }
    };
  }
  return worker;
}

function ensureReady(): Promise<void> {
  if (!ready) {
    ready = new Promise<void>((resolve) => {
      const w = getWorker();
      const handler = (e: MessageEvent<string>) => {
        const line: string = typeof e.data === "string" ? e.data : String(e.data);
        if (line === "readyok") {
          w.removeEventListener("message", handler);
          resolve();
        }
      };
      w.addEventListener("message", handler);
      w.postMessage("uci");
      w.postMessage("isready");
    });
  }
  return ready;
}

// Depth mapped from the app's difficulty setting (aiDepth 2/3/4).
const DEPTH_MAP: Record<number, number> = { 2: 5, 3: 10, 4: 15 };

/**
 * Ask Stockfish for the best move in UCI format ("e2e4", "e7e8q", etc.).
 * Only one search runs at a time; a new call while one is pending will cancel
 * the in-flight search via "stop" before starting the next one.
 */
export async function requestStockfishMove(
  fen: string,
  aiDepth: number
): Promise<string | null> {
  await ensureReady();
  const w = getWorker();

  // Cancel any in-flight search.
  if (pendingResolve) {
    const stale = pendingResolve;
    pendingResolve = null;
    w.postMessage("stop");
    stale(null);
  }

  return new Promise<string | null>((resolve) => {
    pendingResolve = resolve;
    const depth = DEPTH_MAP[aiDepth] ?? 10;
    w.postMessage("ucinewgame");
    w.postMessage(`position fen ${fen}`);
    w.postMessage(`go depth ${depth}`);
  });
}
