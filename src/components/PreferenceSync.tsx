"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePreferences } from "@/store/preferences";

function currentPayload() {
  const s = usePreferences.getState();
  return {
    variantId: s.variantId,
    boardThemeId: s.boardThemeId,
    pieceSetId: s.pieceSetId,
    orientation: s.orientation,
    aiWhite: s.aiWhite,
    aiBlack: s.aiBlack,
    aiDepth: s.aiDepth,
  };
}

function save() {
  return fetch("/api/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentPayload()),
  });
}

/**
 * When signed in, loads the user's saved preferences from the DB (seeding from
 * the current local values if none exist), then debounce-saves on any change.
 * When signed out, the localStorage-backed store is used as before.
 */
export default function PreferenceSync() {
  const { status } = useSession();
  const loaded = useRef(false);

  // Load (or seed) on sign-in.
  useEffect(() => {
    if (status !== "authenticated") {
      loaded.current = false;
      return;
    }
    let cancelled = false;
    fetch("/api/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data) {
          usePreferences.setState({
            variantId: data.variantId,
            boardThemeId: data.boardThemeId,
            pieceSetId: data.pieceSetId,
            orientation: data.orientation,
            aiWhite: data.aiWhite,
            aiBlack: data.aiBlack,
            aiDepth: data.aiDepth,
          });
        } else {
          save(); // no row yet — seed from current local values
        }
        loaded.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Debounced save on change.
  useEffect(() => {
    if (status !== "authenticated") return;
    let timer: ReturnType<typeof setTimeout>;
    const unsub = usePreferences.subscribe(() => {
      if (!loaded.current) return;
      clearTimeout(timer);
      timer = setTimeout(save, 600);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [status]);

  return null;
}
