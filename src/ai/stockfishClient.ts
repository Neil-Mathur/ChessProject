// Client for the Stockfish 18 WASM engine.
// The single-threaded build in /public/stockfish.js self-detects the Worker
// context and boots the engine — no URL hash (a "#...,<flag>" hash suppresses
// auto-init in this build and leaves the worker silent).
// UCI commands are sent via postMessage; UCI output arrives via onmessage.

let worker: Worker | null = null;
let ready: Promise<void> | null = null;

// Pending search: resolve is called with the UCI move string once bestmove arrives.
let pendingResolve: ((move: string | null) => void) | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker("/stockfish.js");
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

/**
 * Ask Stockfish for the best move in UCI format ("e2e4", "e7e8q", etc.).
 * Only one search runs at a time; a new call while one is pending will cancel
 * the in-flight search via "stop" before starting the next one.
 * @param fen The position as a FEN string
 * @param level Stockfish search depth (1-20)
 */
export async function requestStockfishMove(
  fen: string,
  level: number
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
    // Clamp level to 1-20 range
    const depth = Math.max(1, Math.min(20, level));
    w.postMessage("ucinewgame");
    w.postMessage(`position fen ${fen}`);
    w.postMessage(`go depth ${depth}`);
  });
}
