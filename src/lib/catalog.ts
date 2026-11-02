"use client";

import { useEffect, useState } from "react";

/*
 * The public LEGO set catalog (every set from 1949 to announced-but-unreleased),
 * built nightly by scripts/fetch-catalog.mjs from Rebrickable's open data and
 * served as static JSON next to the app. Read-only reference data: nothing here
 * touches the user's vault or their money figures.
 */

export interface CatalogSet {
  /** Rebrickable number, like "10305-1". */
  num: string;
  name: string;
  year: number;
  /** Top-level theme name, like "Star Wars". */
  theme: string;
  /** 0 when not known yet (common for upcoming sets). */
  pieces: number;
  /** Books, gear and spare-part packs rather than buildable sets. */
  extra: boolean;
}

export interface Catalog {
  sets: CatalogSet[];
  themes: Array<{ name: string; count: number }>;
  years: Array<{ year: number; count: number }>;
  byKey: Map<string, CatalogSet>;
}

export interface HighlightSet {
  num: string;
  name: string;
  year: number;
  theme: string;
  pieces: number;
  /** YYYY-MM-DD the set first appeared in the catalog. */
  seen?: string;
}

export interface Highlights {
  updatedAt: string;
  count: number;
  thisYear: number;
  thisYearCount: number;
  upcomingCount: number;
  upcoming: HighlightSet[];
  fresh: HighlightSet[];
  newest: HighlightSet[];
  facts: Array<{ text: string; q?: string }>;
  news: Array<{ title: string; link: string; date: string | null }>;
}

/** Mirrors EXTRAS in scripts/fetch-catalog.mjs. */
export const EXTRA_THEMES = new Set(["Gear", "Books", "Service Packs", "Bulk Bricks", "Other"]);

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const catalogFile = (name: string) => `${base}/catalog/${name}`;
export const setImage = (num: string) => `https://cdn.rebrickable.com/media/sets/${encodeURIComponent(num.toLowerCase())}.jpg`;
export const catalogHref = (q: string) => `/catalog?q=${encodeURIComponent(q)}`;

/** "10305", "10305-1" and " 10305 - 1 " all match the same box. Variant -1 is the default. */
export function setKey(num: string): string {
  const n = num.toLowerCase().replace(/\s+/g, "");
  return n.replace(/-1$/, "");
}

type RawCatalog = { themes: Array<[number, string, number | null]>; sets: Array<[string, string, number, number, number]> };

export function buildCatalog(raw: RawCatalog): Catalog {
  const themes = new Map(raw.themes.map((t) => [t[0], t]));
  const roots = new Map<number, string>();
  const rootName = (id: number) => {
    const hit = roots.get(id);
    if (hit) return hit;
    let t = themes.get(id);
    for (let hops = 0; t?.[2] != null && themes.has(t[2]) && hops < 10; hops++) t = themes.get(t[2]);
    const name = t?.[1] ?? "Other";
    roots.set(id, name);
    return name;
  };

  const sets = raw.sets.map(([num, name, year, themeId, pieces]) => {
    const theme = rootName(themeId);
    return { num, name, year, theme, pieces, extra: EXTRA_THEMES.has(theme) };
  });
  const byKey = new Map<string, CatalogSet>();
  for (const s of sets) if (!byKey.has(setKey(s.num))) byKey.set(setKey(s.num), s);

  const themeCounts = new Map<string, number>();
  const yearCounts = new Map<number, number>();
  for (const s of sets) {
    if (s.extra) continue;
    themeCounts.set(s.theme, (themeCounts.get(s.theme) ?? 0) + 1);
    yearCounts.set(s.year, (yearCounts.get(s.year) ?? 0) + 1);
  }
  return {
    sets,
    byKey,
    themes: [...themeCounts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
    // Every year in the range, so quiet years still show as gaps on the timeline.
    years: yearCounts.size
      ? Array.from({ length: Math.max(...yearCounts.keys()) - Math.min(...yearCounts.keys()) + 1 }, (_, i) => {
          const year = Math.min(...yearCounts.keys()) + i;
          return { year, count: yearCounts.get(year) ?? 0 };
        })
      : [],
  };
}

export const findSet = (catalog: Catalog, input: string) => (input.trim() ? catalog.byKey.get(setKey(input)) : undefined);

export type CatalogSort = "newest" | "oldest" | "pieces" | "name";

export interface CatalogQuery {
  q: string;
  theme: string | null;
  year: number | null;
  upcoming: boolean;
  extras: boolean;
  sort: CatalogSort;
}

export const DEFAULT_QUERY: CatalogQuery = { q: "", theme: null, year: null, upcoming: false, extras: false, sort: "newest" };

export function searchCatalog(sets: CatalogSet[], query: CatalogQuery, thisYear: number): CatalogSet[] {
  const words = query.q.toLowerCase().split(/\s+/).filter(Boolean);
  const out = sets.filter((s) => {
    if (!query.extras && s.extra) return false;
    if (query.theme && s.theme !== query.theme) return false;
    if (query.year != null && s.year !== query.year) return false;
    if (query.upcoming && s.year <= thisYear) return false;
    if (!words.length) return true;
    const hay = `${s.num} ${s.name} ${s.theme}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const exact = words.length === 1 ? setKey(words[0]) : null;
  const cmp: Record<CatalogSort, (a: CatalogSet, b: CatalogSet) => number> = {
    newest: (a, b) => b.year - a.year || b.pieces - a.pieces,
    oldest: (a, b) => a.year - b.year || b.pieces - a.pieces,
    pieces: (a, b) => b.pieces - a.pieces,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  // A typed set number jumps to the top whatever the sort.
  return out.sort((a, b) => (exact ? Number(setKey(b.num) === exact) - Number(setKey(a.num) === exact) : 0) || cmp[query.sort](a, b));
}

let pending: Promise<Catalog> | null = null;

/** Loads once per page view (about 1.4 MB, cached by the browser after that). */
export function loadCatalog(): Promise<Catalog> {
  pending ??= fetch(catalogFile("sets.json"))
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<RawCatalog>;
    })
    .then(buildCatalog)
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

type Loaded<T> = { data: T | null; error: boolean; retry: () => void };

function useLoad<T>(load: () => Promise<T>, enabled: boolean): Loaded<T> {
  const [state, setState] = useState<{ data: T | null; error: boolean }>({ data: null, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    load().then(
      (data) => live && setState({ data, error: false }),
      () => live && setState({ data: null, error: true }),
    );
    return () => {
      live = false;
    };
  }, [enabled, attempt, load]);
  return { ...state, retry: () => setAttempt((a) => a + 1) };
}

export const useCatalog = (enabled = true) => useLoad(loadCatalog, enabled);

let pendingHighlights: Promise<Highlights> | null = null;
function loadHighlights(): Promise<Highlights> {
  pendingHighlights ??= fetch(catalogFile("highlights.json"))
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Highlights>;
    })
    .catch((e) => {
      pendingHighlights = null;
      throw e;
    });
  return pendingHighlights;
}

export const useHighlights = () => useLoad(loadHighlights, true);

/** Rebrickable theme names that differ from the names collectors (and our starter themes) use. */
const THEME_ALIASES: Record<string, string> = {
  "Super Heroes Marvel": "Marvel",
  "Super Heroes DC": "DC",
  "LEGO Ideas and CUUSOO": "Ideas",
  "LEGO Art": "Art",
  Creator: "Creator 3-in-1",
  "The Hobbit and Lord of the Rings": "Lord of the Rings",
};
export const vaultThemeName = (theme: string) => THEME_ALIASES[theme] ?? theme;

/** Set numbers mentioned in a headline, like "Review: 75642 Showdown…". */
export const numbersIn = (title: string) => [...new Set(title.match(/\b\d{4,6}(?:-\d)?\b/g) ?? [])].filter((n) => !/^(19|20)\d\d$/.test(n));
