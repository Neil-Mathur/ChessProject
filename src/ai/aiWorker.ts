/// <reference lib="webworker" />
// Web Worker: runs the alpha-beta search off the main thread so the UI stays
// responsive while the computer thinks.
import { getVariant, searchBestMove, type GameState, type Move } from "@/engine";

interface Request {
  id: number;
  state: GameState;
  variantId: string;
  depth: number;
}
interface Response {
  id: number;
  move: Move | null;
}

self.onmessage = (e: MessageEvent<Request>) => {
  const { id, state, variantId, depth } = e.data;
  const variant = getVariant(variantId);
  const { move } = searchBestMove(state, variant, depth);
  const res: Response = { id, move };
  (self as DedicatedWorkerGlobalScope).postMessage(res);
};
