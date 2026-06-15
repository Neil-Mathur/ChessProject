// Main-thread client for the AI worker. Lazily spawns one worker and exposes a
// promise-based API. Handles one request at a time (Phase 2).
import type { GameState, Move } from "@/engine";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (move: Move | null) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./aiWorker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ id: number; move: Move | null }>) => {
      const resolve = pending.get(e.data.id);
      if (resolve) {
        pending.delete(e.data.id);
        resolve(e.data.move);
      }
    };
  }
  return worker;
}

export function requestBestMove(
  state: GameState,
  variantId: string,
  depth: number
): Promise<Move | null> {
  const w = getWorker();
  const id = ++seq;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    w.postMessage({ id, state, variantId, depth });
  });
}
