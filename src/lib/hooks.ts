"use client";

import { useEffect, useMemo, useState } from "react";
import { gcPhotos, photoURL } from "./photos";
import { FALLBACK_THEME, themeMap, useVault } from "./store";
import type { Theme } from "./types";

export const DRAFT_KEY = "brickvault:draft";

function draftPhotoIds(): string[] {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? ((JSON.parse(raw).photoIds as string[]) ?? []) : [];
  } catch {
    return [];
  }
}

let swept = false;

/** Loads the vault from localStorage once on the client, then sweeps orphaned photos. */
export function useVaultHydration(): boolean {
  const [ready, setReady] = useState(() => useVault.persist.hasHydrated());
  useEffect(() => {
    const unsub = useVault.persist.onFinishHydration(() => setReady(true));
    if (!useVault.persist.hasHydrated()) void useVault.persist.rehydrate();
    else setReady(true);
    return unsub;
  }, []);
  useEffect(() => {
    if (!ready || swept) return;
    swept = true;
    const keep = new Set([...useVault.getState().sets.flatMap((s) => s.photoIds), ...draftPhotoIds()]);
    void gcPhotos(keep).catch(() => undefined);
  }, [ready]);
  return ready;
}

export function usePhotoURL(id: string | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setUrl(null);
    if (id) void photoURL(id).then((u) => live && setUrl(u)).catch(() => live && setUrl(null));
    return () => {
      live = false;
    };
  }, [id]);
  return url;
}

export function useThemes(): { themes: Theme[]; byId: Map<string, Theme>; get: (id: string | null | undefined) => Theme } {
  const themes = useVault((s) => s.themes);
  return useMemo(() => {
    const byId = themeMap(themes);
    return { themes, byId, get: (id) => (id ? byId.get(id) : undefined) ?? FALLBACK_THEME };
  }, [themes]);
}

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatch(mq.matches);
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** Decorative motion is on: the user's setting, falling back to the system preference. */
export function useMotionAllowed(): boolean {
  const pref = useVault((s) => s.prefs.motion);
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)");
  return pref === "full" || (pref === "system" && !reduce);
}
