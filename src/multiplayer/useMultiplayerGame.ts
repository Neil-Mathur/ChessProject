"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getVariant } from "@/engine/variants";
import type { Color, GameResult, GameState, Move } from "@/engine/types";
import type { Variant } from "@/engine/variant";
import { getSocket } from "./socket";

export type MultiplayerStatus =
  | "connecting"   // socket not yet joined room
  | "waiting"      // creator waiting for opponent
  | "playing"      // both players present
  | "over"         // game ended (result set)
  | "disconnected" // opponent left (game not over)
  | "error";

export interface MultiplayerGame {
  state: GameState | null;
  variant: Variant | null;
  myColor: Color | null;
  moveLog: string[];
  result: GameResult | null;
  status: MultiplayerStatus;
  statusMessage: string;
  sendMove: (move: Move) => void;
  resign: () => void;
}

const TOKEN_KEY = (roomId: string) => `mp_token_${roomId}`;

export function useMultiplayerGame(roomId: string): MultiplayerGame {
  const { data: session } = useSession();
  const [state, setState] = useState<GameState | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [myColor, setMyColor] = useState<Color | null>(null);
  const [moveLog, setMoveLog] = useState<string[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [status, setStatus] = useState<MultiplayerStatus>("connecting");
  const [statusMessage, setStatusMessage] = useState("Connecting…");
  // Track whether we're the creator so we know when to flip to "playing".
  const isCreator = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function joinRoom() {
      const savedToken = sessionStorage.getItem(TOKEN_KEY(roomId)) ?? undefined;
      const userId = session?.user?.id ?? undefined;
      socket.emit("join_room", { roomId, playerToken: savedToken, userId }, (res) => {
        if (!res.ok) {
          setStatus("error");
          setStatusMessage(res.error);
          return;
        }
        const { info } = res;
        sessionStorage.setItem(TOKEN_KEY(roomId), info.playerToken);
        setMyColor(info.color);
        setVariant(getVariant(info.variantId));
        setState(info.state);
        setMoveLog(info.moveLog);
        if (info.result) {
          setResult(info.result);
          setStatus("over");
          setStatusMessage("Game over");
        } else if (info.color === "w" && !savedToken) {
          // Brand new White player — still waiting for opponent.
          isCreator.current = true;
          setStatus("waiting");
          setStatusMessage("Share the room code with your opponent.");
        } else {
          setStatus("playing");
          setStatusMessage("Game in progress");
        }
      });
    }

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
    }

    socket.on("opponent_joined", () => {
      setStatus("playing");
      setStatusMessage("Game in progress");
    });

    socket.on("opponent_reconnected", () => {
      setStatus("playing");
      setStatusMessage("Game in progress");
    });

    socket.on("opponent_disconnected", () => {
      setStatus("disconnected");
      setStatusMessage("Opponent disconnected — waiting for them to return…");
    });

    socket.on("state_update", ({ state: s, moveLog: ml, result: r }) => {
      setState(s);
      setMoveLog(ml);
      if (r) {
        setResult(r);
        setStatus("over");
        setStatusMessage("Game over");
      }
    });

    socket.on("game_over", ({ result: r }) => {
      setResult(r);
      setStatus("over");
      setStatusMessage("Game over");
    });

    socket.on("error", (msg) => {
      setStatusMessage(msg);
    });

    return () => {
      socket.off("opponent_joined");
      socket.off("opponent_reconnected");
      socket.off("opponent_disconnected");
      socket.off("state_update");
      socket.off("game_over");
      socket.off("error");
      socket.off("connect", joinRoom);
    };
  }, [roomId, session?.user?.id]);

  function sendMove(move: Move) {
    if (status !== "playing") return;
    getSocket().emit("move", { move });
  }

  function resign() {
    if (status !== "playing") return;
    getSocket().emit("resign");
  }

  return {
    state,
    variant,
    myColor,
    moveLog,
    result,
    status,
    statusMessage,
    sendMove,
    resign,
  };
}
