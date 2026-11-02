import type { LegoSet, Paise, SetFilters, SortKey, StatusScope, Theme } from "./types";
import { monthKey, normalise, todayISO } from "./utils";

/*
 * Every number BRICKVAULT shows is derived here from the actual set records.
 * Two money ideas are kept apart on purpose:
 *   - spent:  what the user paid (purchasePrice)
 *   - value:  what the user *estimates* a set is worth now (marketValue)
 * Gain/loss and return only use sets that have both, so a missing estimate
 * never shows up as a fake loss.
 */

export interface ThemeSlice {
  themeId: string;
  spent: Paise;
  count: number;
  pieces: number;
  value: Paise;
  valuedCount: number;
  /** Share of total spend, 0..1 */
  share: number;
  sets: LegoSet[];
}

export interface Stats {
  count: number;
  pricedCount: number;
  totalSpent: Paise;
  totalPieces: number;
  avgPrice: Paise | null;
  pricePerPiece: Paise | null;
  estValue: Paise;
  valuedCount: number;
  /** Cost of the sets that have an estimate (the base for gain/loss). */
  plBasis: Paise;
  plValue: Paise;
  plCount: number;
  unrealised: Paise | null;
  returnPct: number | null;
  topByPrice: LegoSet | null;
  topByValue: LegoSet | null;
  topTheme: ThemeSlice | null;
  byTheme: ThemeSlice[];
}

export function inScope(sets: LegoSet[], status: StatusScope): LegoSet[] {
  return status === "all" ? sets : sets.filter((s) => s.status === status);
}

export function gainOf(set: LegoSet): { delta: Paise; pct: number | null } | null {
  if (set.purchasePrice == null || set.marketValue == null) return null;
  const delta = set.marketValue - set.purchasePrice;
  return { delta, pct: set.purchasePrice > 0 ? (delta / set.purchasePrice) * 100 : null };
}

export function pricePerPieceOf(set: LegoSet): Paise | null {
  if (set.purchasePrice == null || !set.pieces) return null;
  return Math.round(set.purchasePrice / set.pieces);
}

export function computeStats(sets: LegoSet[]): Stats {
  let totalSpent = 0;
  let pricedCount = 0;
  let totalPieces = 0;
  let pppPrice = 0;
  let pppPieces = 0;
  let estValue = 0;
  let valuedCount = 0;
  let plBasis = 0;
  let plValue = 0;
  let plCount = 0;
  let topByPrice: LegoSet | null = null;
  let topByValue: LegoSet | null = null;
  const themes = new Map<string, ThemeSlice>();

  for (const s of sets) {
    const slice =
      themes.get(s.themeId) ??
      themes
        .set(s.themeId, { themeId: s.themeId, spent: 0, count: 0, pieces: 0, value: 0, valuedCount: 0, share: 0, sets: [] })
        .get(s.themeId)!;
    slice.count += 1;
    slice.sets.push(s);

    if (s.pieces) {
      totalPieces += s.pieces;
      slice.pieces += s.pieces;
    }
    if (s.purchasePrice != null) {
      totalSpent += s.purchasePrice;
      pricedCount += 1;
      slice.spent += s.purchasePrice;
      if (!topByPrice || s.purchasePrice > (topByPrice.purchasePrice ?? -1)) topByPrice = s;
      if (s.pieces) {
        pppPrice += s.purchasePrice;
        pppPieces += s.pieces;
      }
    }
    if (s.marketValue != null) {
      estValue += s.marketValue;
      valuedCount += 1;
      slice.value += s.marketValue;
      slice.valuedCount += 1;
      if (!topByValue || s.marketValue > (topByValue.marketValue ?? -1)) topByValue = s;
      if (s.purchasePrice != null) {
        plBasis += s.purchasePrice;
        plValue += s.marketValue;
        plCount += 1;
      }
    }
  }

  const byTheme = [...themes.values()]
    .map((t) => ({ ...t, share: totalSpent > 0 ? t.spent / totalSpent : 0 }))
    .sort((a, b) => b.spent - a.spent || b.count - a.count);

  const unrealised = plCount > 0 ? plValue - plBasis : null;

  return {
    count: sets.length,
    pricedCount,
    totalSpent,
    totalPieces,
    // Averages read better in whole rupees; per-piece keeps paise because it is small.
    avgPrice: pricedCount > 0 ? Math.round(totalSpent / pricedCount / 100) * 100 : null,
    pricePerPiece: pppPieces > 0 ? Math.round(pppPrice / pppPieces) : null,
    estValue,
    valuedCount,
    plBasis,
    plValue,
    plCount,
    unrealised,
    returnPct: unrealised != null && plBasis > 0 ? (unrealised / plBasis) * 100 : null,
    topByPrice,
    topByValue,
    topTheme: byTheme.find((t) => t.spent > 0) ?? null,
    byTheme,
  };
}

export interface Realised {
  count: number;
  proceeds: Paise;
  basis: Paise;
  realised: Paise | null;
}

/** Profit or loss on sets the user actually sold. */
export function computeRealised(sets: LegoSet[]): Realised {
  let proceeds = 0;
  let basis = 0;
  let paired = 0;
  let pairs = 0;
  let count = 0;
  for (const s of sets) {
    if (s.status !== "sold") continue;
    count += 1;
    if (s.salePrice == null) continue;
    proceeds += s.salePrice;
    if (s.purchasePrice != null) {
      basis += s.purchasePrice;
      paired += s.salePrice;
      pairs += 1;
    }
  }
  return { count, proceeds, basis, realised: pairs > 0 ? paired - basis : null };
}

export const DEFAULT_FILTERS: SetFilters = {
  q: "",
  themeIds: [],
  conditions: [],
  status: "owned",
  from: null,
  to: null,
  minPrice: null,
  maxPrice: null,
};

export function activeFilterCount(f: SetFilters): number {
  return (
    (f.themeIds.length ? 1 : 0) +
    (f.conditions.length ? 1 : 0) +
    (f.status !== "owned" ? 1 : 0) +
    (f.from || f.to ? 1 : 0) +
    (f.minPrice != null || f.maxPrice != null ? 1 : 0)
  );
}

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function matchesQuery(set: LegoSet, q: string, themeName = ""): boolean {
  const query = normalise(q);
  if (!query) return true;
  const hay = normalise([set.name, set.setNumber, themeName, set.seller, set.notes].join(" "));
  const tokens = query.split(/\s+/);
  if (tokens.every((t) => hay.includes(t))) return true;
  // "10305" should find "10305-1" and the other way round
  const num = compact(query);
  const own = compact(set.setNumber);
  return num.length >= 3 && own.length >= 3 && (own.startsWith(num) || num.startsWith(own));
}

export function filterSets(sets: LegoSet[], f: SetFilters, themes: Map<string, Theme>): LegoSet[] {
  return sets.filter((s) => {
    if (f.status !== "all" && s.status !== f.status) return false;
    if (f.themeIds.length && !f.themeIds.includes(s.themeId)) return false;
    if (f.conditions.length && !f.conditions.includes(s.condition)) return false;
    if (f.from && (!s.purchaseDate || s.purchaseDate < f.from)) return false;
    if (f.to && (!s.purchaseDate || s.purchaseDate > f.to)) return false;
    if (f.minPrice != null && (s.purchasePrice == null || s.purchasePrice < f.minPrice)) return false;
    if (f.maxPrice != null && (s.purchasePrice == null || s.purchasePrice > f.maxPrice)) return false;
    if (f.q && !matchesQuery(s, f.q, themes.get(s.themeId)?.name)) return false;
    return true;
  });
}

type Pick = (s: LegoSet) => number | string | null;

const SORTS: Record<SortKey, { pick: Pick; dir: 1 | -1 }> = {
  recent: { pick: (s) => s.createdAt, dir: -1 },
  name: { pick: (s) => s.name.toLowerCase(), dir: 1 },
  "price-desc": { pick: (s) => s.purchasePrice, dir: -1 },
  "price-asc": { pick: (s) => s.purchasePrice, dir: 1 },
  "date-desc": { pick: (s) => s.purchaseDate, dir: -1 },
  "date-asc": { pick: (s) => s.purchaseDate, dir: 1 },
  "pieces-desc": { pick: (s) => s.pieces, dir: -1 },
  "pieces-asc": { pick: (s) => s.pieces, dir: 1 },
  "value-desc": { pick: (s) => s.marketValue, dir: -1 },
  "value-asc": { pick: (s) => s.marketValue, dir: 1 },
  "gain-desc": { pick: (s) => gainOf(s)?.delta ?? null, dir: -1 },
};

export const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recently added",
  name: "Name A–Z",
  "price-desc": "Price: high to low",
  "price-asc": "Price: low to high",
  "date-desc": "Purchased: newest",
  "date-asc": "Purchased: oldest",
  "pieces-desc": "Pieces: most",
  "pieces-asc": "Pieces: fewest",
  "value-desc": "Est. value: high to low",
  "value-asc": "Est. value: low to high",
  "gain-desc": "Biggest gain",
};

/** Sorts a copy. Missing values always sink to the bottom, whatever the direction. */
export function sortSets(sets: LegoSet[], key: SortKey): LegoSet[] {
  const { pick, dir } = SORTS[key];
  return [...sets].sort((a, b) => {
    const va = pick(a);
    const vb = pick(b);
    if (va == null && vb == null) return a.name.localeCompare(b.name);
    if (va == null) return 1;
    if (vb == null) return -1;
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return a.name.localeCompare(b.name);
  });
}

export interface MonthBucket {
  key: string;
  spent: Paise;
  cumulative: Paise;
  count: number;
  sets: LegoSet[];
}

export type MonthRange = "12m" | "24m" | "all";

function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Month-by-month spending, with empty months filled so the chart has no gaps. */
export function monthlySeries(sets: LegoSet[], range: MonthRange, today = todayISO()): MonthBucket[] {
  const dated = sets.filter((s) => s.purchaseDate && s.purchasePrice != null);
  const current = monthKey(today);
  const latest = dated.reduce((max, s) => (monthKey(s.purchaseDate!) > max ? monthKey(s.purchaseDate!) : max), current);
  let start: string;
  if (range === "all") {
    const earliest = dated.reduce((min, s) => (monthKey(s.purchaseDate!) < min ? monthKey(s.purchaseDate!) : min), latest);
    start = earliest < addMonths(latest, -11) ? earliest : addMonths(latest, -11);
  } else {
    start = addMonths(latest, range === "12m" ? -11 : -23);
  }

  const buckets: MonthBucket[] = [];
  for (let k = start; k <= latest; k = addMonths(k, 1)) {
    buckets.push({ key: k, spent: 0, cumulative: 0, count: 0, sets: [] });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  let before = 0;
  for (const s of dated) {
    const k = monthKey(s.purchaseDate!);
    const i = index.get(k);
    if (i == null) {
      if (k < start) before += s.purchasePrice!;
      continue;
    }
    buckets[i].spent += s.purchasePrice!;
    buckets[i].count += 1;
    buckets[i].sets.push(s);
  }
  let running = before;
  for (const b of buckets) {
    running += b.spent;
    b.cumulative = running;
    b.sets.sort((a, z) => (z.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""));
  }
  return buckets;
}

export type BoardMode = "paid" | "value" | "gain";

export interface BoardRow {
  set: LegoSet;
  amount: Paise;
  pct: number | null;
}

export function leaderboard(sets: LegoSet[], mode: BoardMode, limit = 8): BoardRow[] {
  const rows: BoardRow[] = [];
  for (const s of sets) {
    if (mode === "paid" && s.purchasePrice != null) rows.push({ set: s, amount: s.purchasePrice, pct: null });
    if (mode === "value" && s.marketValue != null) rows.push({ set: s, amount: s.marketValue, pct: null });
    if (mode === "gain") {
      const g = gainOf(s);
      if (g) rows.push({ set: s, amount: g.delta, pct: g.pct });
    }
  }
  return rows.sort((a, b) => b.amount - a.amount).slice(0, limit);
}

export interface TimelineGroup {
  key: string;
  total: Paise;
  sets: LegoSet[];
}

/** Purchases grouped by month, newest first. Undated sets are left out. */
export function purchaseTimeline(sets: LegoSet[]): TimelineGroup[] {
  const groups = new Map<string, TimelineGroup>();
  const dated = sets
    .filter((s) => s.purchaseDate)
    .sort((a, b) => b.purchaseDate!.localeCompare(a.purchaseDate!) || b.createdAt.localeCompare(a.createdAt));
  for (const s of dated) {
    const k = monthKey(s.purchaseDate!);
    const g = groups.get(k) ?? groups.set(k, { key: k, total: 0, sets: [] }).get(k)!;
    g.sets.push(s);
    g.total += s.purchasePrice ?? 0;
  }
  return [...groups.values()];
}

/** Rounds a chart maximum up to a friendly number (1, 2, 2.5 or 5 × 10^n). */
export function niceMax(n: number): number {
  if (n <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(n)));
  for (const step of [1, 2, 2.5, 5, 10]) if (n <= step * exp) return step * exp;
  return 10 * exp;
}
