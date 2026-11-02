import { describe, expect, it } from "vitest";
import { computeRealised, computeStats, DEFAULT_FILTERS, filterSets, gainOf, leaderboard, monthlySeries, niceMax, sortSets } from "./calc";
import { csvToSets, parseCSV, setsToCSV } from "./csv";
import { compactINR, formatINR, formatPct, parseINR } from "./money";
import type { LegoSet, Theme } from "./types";

const theme = (id: string, name: string): Theme => ({ id, name, color: "#4062FF", pattern: "dots", icon: "cog", createdAt: "" });
const themes = new Map([theme("tech", "Technic"), theme("icons", "Icons"), theme("sw", "Star Wars")].map((t) => [t.id, t]));

let n = 0;
const set = (p: Partial<LegoSet>): LegoSet => ({
  id: `s${++n}`,
  name: "Set",
  setNumber: "",
  themeId: "tech",
  pieces: null,
  purchasePrice: null,
  purchaseDate: null,
  seller: "",
  condition: "sealed",
  marketValue: null,
  marketValueAt: null,
  notes: "",
  photoIds: [],
  status: "owned",
  salePrice: null,
  saleDate: null,
  history: [],
  createdAt: `2026-01-0${n % 9}T00:00:00Z`,
  updatedAt: "",
  ...p,
});

describe("money", () => {
  it("formats rupees with Indian grouping", () => {
    expect(formatINR(150000)).toBe("₹1,500");
    expect(formatINR(2500000)).toBe("₹25,000");
    expect(formatINR(12500000)).toBe("₹1,25,000");
    expect(formatINR(125000000)).toBe("₹12,50,000");
    expect(formatINR(99950)).toBe("₹999.50");
    expect(formatINR(-250000)).toBe("−₹2,500");
    expect(formatINR(250000, { signed: true })).toBe("+₹2,500");
    expect(formatINR(null)).toBe("—");
  });

  it("parses what people type", () => {
    expect(parseINR("1,25,000")).toEqual({ ok: true, value: 12500000 });
    expect(parseINR("₹ 39999")).toEqual({ ok: true, value: 3999900 });
    expect(parseINR("25k")).toEqual({ ok: true, value: 2500000 });
    expect(parseINR("1.2L")).toEqual({ ok: true, value: 12000000 });
    expect(parseINR("1.5 lakh")).toEqual({ ok: true, value: 15000000 });
    expect(parseINR("499.99")).toEqual({ ok: true, value: 49999 });
    expect(parseINR("")).toEqual({ ok: true, value: null });
    expect(parseINR("abc").ok).toBe(false);
    expect(parseINR("-5").ok).toBe(false);
    expect(parseINR("12.345").ok).toBe(false);
    expect(parseINR("20cr").ok).toBe(false);
  });

  it("compacts amounts for chart axes", () => {
    expect(compactINR(95000)).toBe("₹950");
    expect(compactINR(2550000)).toBe("₹25.5K");
    expect(compactINR(12500000)).toBe("₹1.25L");
    expect(compactINR(240000000)).toBe("₹24L");
    expect(compactINR(2400000000)).toBe("₹2.4Cr");
  });

  it("formats percentages", () => {
    expect(formatPct(12.345, { signed: true })).toBe("+12.3%");
    expect(formatPct(-4)).toBe("−4.0%");
    expect(formatPct(null)).toBe("—");
  });
});

describe("collection stats", () => {
  const sets = [
    set({ themeId: "tech", purchasePrice: 2500000, marketValue: 3000000, pieces: 2000, purchaseDate: "2026-03-10" }),
    set({ themeId: "tech", purchasePrice: 1500000, pieces: 1000, purchaseDate: "2026-03-20" }),
    set({ themeId: "icons", purchasePrice: 1200000, marketValue: 1000000, pieces: 1200, purchaseDate: "2025-12-01" }),
    set({ themeId: "sw", purchasePrice: null, marketValue: 500000, pieces: 300 }),
  ];
  const s = computeStats(sets);

  it("adds up spend, pieces and averages from the records", () => {
    expect(s.totalSpent).toBe(5200000);
    expect(s.count).toBe(4);
    expect(s.pricedCount).toBe(3);
    expect(s.totalPieces).toBe(4500);
    expect(s.avgPrice).toBe(Math.round(5200000 / 3 / 100) * 100);
    // price per piece only uses sets with both
    expect(s.pricePerPiece).toBe(Math.round(5200000 / 4200));
  });

  it("keeps spending and estimated value apart", () => {
    expect(s.estValue).toBe(4500000);
    // gain only over sets with both numbers: (30000 + 10000) - (25000 + 12000)
    expect(s.plBasis).toBe(3700000);
    expect(s.plValue).toBe(4000000);
    expect(s.unrealised).toBe(300000);
    expect(s.returnPct).toBeCloseTo((300000 / 3700000) * 100);
  });

  it("aggregates spending by theme and finds the records", () => {
    expect(s.byTheme.map((t) => [t.themeId, t.spent])).toEqual([
      ["tech", 4000000],
      ["icons", 1200000],
      ["sw", 0],
    ]);
    expect(s.topTheme?.themeId).toBe("tech");
    expect(s.topByPrice?.purchasePrice).toBe(2500000);
    expect(s.byTheme[0].share).toBeCloseTo(4000000 / 5200000);
  });

  it("handles an empty collection", () => {
    const e = computeStats([]);
    expect(e.totalSpent).toBe(0);
    expect(e.avgPrice).toBeNull();
    expect(e.unrealised).toBeNull();
    expect(e.returnPct).toBeNull();
    expect(e.topTheme).toBeNull();
  });

  it("does not divide by zero for free sets", () => {
    expect(gainOf(set({ purchasePrice: 0, marketValue: 100000 }))).toEqual({ delta: 100000, pct: null });
    expect(computeStats([set({ purchasePrice: 0, marketValue: 100000 })]).returnPct).toBeNull();
  });

  it("computes realised profit only on sold sets", () => {
    const r = computeRealised([
      set({ status: "sold", purchasePrice: 1000000, salePrice: 1500000 }),
      set({ status: "sold", purchasePrice: null, salePrice: 200000 }),
      set({ status: "owned", purchasePrice: 999900 }),
    ]);
    expect(r.count).toBe(2);
    expect(r.proceeds).toBe(1700000);
    expect(r.realised).toBe(500000);
  });
});

describe("filters, sorting and charts", () => {
  const a = set({ name: "Ferrari Daytona SP3", setNumber: "42143", themeId: "tech", purchasePrice: 3999900, purchaseDate: "2026-02-01", condition: "sealed" });
  const b = set({ name: "Lion Knights' Castle", setNumber: "10305-1", themeId: "icons", purchasePrice: 3499900, purchaseDate: "2025-06-01", condition: "built", pieces: 4514 });
  const c = set({ name: "Orchid", setNumber: "10311", themeId: "icons", status: "sold", pieces: 608 });
  const all = [a, b, c];

  it("searches by name and set number", () => {
    expect(filterSets(all, { ...DEFAULT_FILTERS, q: "ferrari" }, themes)).toEqual([a]);
    expect(filterSets(all, { ...DEFAULT_FILTERS, q: "10305" }, themes)).toEqual([b]);
    expect(filterSets(all, { ...DEFAULT_FILTERS, q: "42143-1" }, themes)).toEqual([a]);
    expect(filterSets(all, { ...DEFAULT_FILTERS, q: "technic" }, themes)).toEqual([a]);
  });

  it("filters by theme, condition, status, date and price", () => {
    expect(filterSets(all, DEFAULT_FILTERS, themes)).toEqual([a, b]);
    expect(filterSets(all, { ...DEFAULT_FILTERS, status: "all", themeIds: ["icons"] }, themes)).toEqual([b, c]);
    expect(filterSets(all, { ...DEFAULT_FILTERS, conditions: ["built"] }, themes)).toEqual([b]);
    expect(filterSets(all, { ...DEFAULT_FILTERS, from: "2026-01-01" }, themes)).toEqual([a]);
    expect(filterSets(all, { ...DEFAULT_FILTERS, maxPrice: 3500000 }, themes)).toEqual([b]);
  });

  it("sorts with missing values last", () => {
    expect(sortSets(all, "price-desc").map((s) => s.id)).toEqual([a.id, b.id, c.id]);
    expect(sortSets(all, "price-asc").map((s) => s.id)).toEqual([b.id, a.id, c.id]);
    expect(sortSets(all, "pieces-desc")[2].id).toBe(a.id);
  });

  it("buckets spending by month with gaps filled and a running total", () => {
    const months = monthlySeries([a, b], "12m", "2026-03-15");
    expect(months).toHaveLength(12);
    expect(months[0].key).toBe("2025-04");
    expect(months.at(-1)?.key).toBe("2026-03");
    expect(months.find((m) => m.key === "2026-02")?.spent).toBe(3999900);
    expect(months.at(-1)?.cumulative).toBe(3999900 + 3499900);
  });

  it("counts spending before the window in the running total", () => {
    const old = set({ purchasePrice: 100000, purchaseDate: "2020-01-01" });
    const months = monthlySeries([old, a], "12m", "2026-03-15");
    expect(months[0].cumulative).toBe(100000);
  });

  it("ranks the leaderboard", () => {
    expect(leaderboard(all, "paid").map((r) => r.set.id)).toEqual([a.id, b.id]);
  });

  it("rounds chart maxima to friendly numbers", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(37)).toBe(50);
    expect(niceMax(120)).toBe(200);
    expect(niceMax(2200000)).toBe(2500000);
  });
});

describe("csv", () => {
  it("round-trips sets through CSV, quoting awkward text", () => {
    const s = set({ name: 'Castle, "big" one', setNumber: "10305", themeId: "icons", purchasePrice: 3499900, purchaseDate: "2025-06-01", condition: "built", notes: "line1\nline2" });
    const csv = setsToCSV([s], themes);
    const back = csvToSets(csv);
    expect(back.errors).toEqual([]);
    expect(back.rows[0]).toMatchObject({ name: 'Castle, "big" one', themeName: "Icons", purchasePrice: 3499900, notes: "line1\nline2", condition: "built" });
  });

  it("neutralises spreadsheet formulas on export", () => {
    const csv = setsToCSV([set({ name: "=HYPERLINK(1)" })], themes);
    expect(csv).toContain("'=HYPERLINK(1)");
  });

  it("reports bad rows and keeps good ones", () => {
    const res = csvToSets("Name,Price,Date,Condition\nGood,25k,2025-01-01,sealed\n,100,,\nBad price,abc,,\nFuture,1,2999-01-01,");
    expect(res.rows.map((r) => r.name)).toEqual(["Good"]);
    expect(res.rows[0].purchasePrice).toBe(2500000);
    expect(res.errors).toHaveLength(3);
  });

  it("parses quoted fields and CRLF", () => {
    expect(parseCSV('a,"b,c"\r\n"d ""e""",f')).toEqual([
      ["a", "b,c"],
      ['d "e"', "f"],
    ]);
  });
});
