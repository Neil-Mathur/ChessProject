// Deterministic engine self-test. Run: npx tsx src/engine/selftest.ts
import { getVariant } from "./variants";
import { parseSquare, squareName } from "./board";
import { searchBestMove } from "./ai/search";
import { GameState, Move, Piece } from "./types";

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
}

function move(v: ReturnType<typeof getVariant>, state: GameState, from: string, to: string): GameState {
  const fromSq = parseSquare(from);
  const toSq = parseSquare(to);
  const m = v.legalMoves(state).find((x: Move) => x.from === fromSq && x.to === toSq && (!x.promotion || x.promotion === "q"));
  if (!m) throw new Error(`illegal move ${from}${to} for ${state.sideToMove}`);
  return v.applyMove(state, m);
}

// --- Standard chess ---
const std = getVariant("standard");
let s = std.setup();
check("standard: 20 opening moves", std.legalMoves(s).length === 20);
check("standard: white to move, 1 ply", s.sideToMove === "w" && s.movesRemaining === 1);
s = move(std, s, "e2", "e4");
check("standard: after e4 it's black's turn", s.sideToMove === "b" && s.movesRemaining === 1);

// --- Monster King ---
const mk = getVariant("monster-king");
let m = mk.setup();
check("monster: black king on e8", squareName(parseSquare("e8")) === "e8" && m.board[parseSquare("e8")]?.type === "k");
check("monster: black has exactly 4 pieces (K + 3 pawns)", m.board.filter((p) => p?.color === "b").length === 4);
check("monster: white moves once", mk.movesPerTurn("w") === 1);
check("monster: black moves twice", mk.movesPerTurn("b") === 2);

// White moves once -> black's turn with 2 plies.
m = move(mk, m, "e2", "e4");
check("monster: after white move, black has 2 plies", m.sideToMove === "b" && m.movesRemaining === 2);
// Black uses two plies -> back to white.
m = move(mk, m, "e7", "e5");
check("monster: after black's 1st ply, still black (1 left)", m.sideToMove === "b" && m.movesRemaining === 1);
m = move(mk, m, "d7", "d5");
check("monster: after black's 2nd ply, white to move", m.sideToMove === "w" && m.movesRemaining === 1);
check("monster: no result yet", mk.result(m) === null);

// --- Capture-the-king win condition ---
// Build a position where White can capture the black king in one move.
let k = mk.setup();
// Hand-place: white queen next to black king, white to move.
k = {
  ...k,
  board: k.board.map((p, i) =>
    i === parseSquare("e7") ? { color: "w", type: "q" } : i === parseSquare("d7") || i === parseSquare("f7") ? null : p
  ),
};
// Remove the black pawn we overwrote bookkeeping aside; ensure white to move.
k = { ...k, sideToMove: "w", movesRemaining: 1 };
check("monster: king not yet captured", mk.result(k) === null);
const kill = mk.legalMoves(k).find((x) => x.to === parseSquare("e8") && x.from === parseSquare("e7"));
check("monster: queen can capture the king", !!kill);
const after = mk.applyMove(k, kill!);
const res = mk.result(after);
check("monster: capturing black king => White wins", res?.outcome === "white");
check("monster: engine survives missing king (no crash on legalMoves)", Array.isArray(mk.legalMoves(after)));

// --- AI search ---
function emptyState(variantId: string, sideToMove: "w" | "b"): GameState {
  return {
    board: new Array(64).fill(null) as (Piece | null)[],
    sideToMove,
    movesRemaining: 1,
    castling: { wk: false, wq: false, bk: false, bq: false },
    enPassant: null,
    variantId,
  };
}

// Standard: White should grab a free hanging rook (no recapture available).
{
  const st = emptyState("standard", "w");
  st.board[parseSquare("e1")] = { color: "w", type: "k" };
  st.board[parseSquare("d1")] = { color: "w", type: "q" };
  st.board[parseSquare("a8")] = { color: "b", type: "k" };
  st.board[parseSquare("d8")] = { color: "b", type: "r" };
  const { move } = searchBestMove(st, std, 3);
  check(
    "ai/standard: captures the free rook (d1xd8)",
    !!move && squareName(move.from) === "d1" && squareName(move.to) === "d8"
  );
}

// Monster King: White should capture the enemy king when it can.
{
  const st = emptyState("monster-king", "w");
  st.board[parseSquare("e1")] = { color: "w", type: "k" };
  st.board[parseSquare("e7")] = { color: "w", type: "q" };
  st.board[parseSquare("e8")] = { color: "b", type: "k" };
  const { move, score } = searchBestMove(st, mk, 2);
  check(
    "ai/monster: captures the enemy king (e7xe8)",
    !!move && squareName(move.to) === "e8" && score > 900000
  );
}

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
