import type { Paise } from "./types";

/**
 * Currency config. INR is the default; everything money-related goes through
 * this module so another currency can be added later in one place.
 */
export const CURRENCY = { code: "INR", locale: "en-IN", symbol: "₹" } as const;

/** Upper bound for a single amount: ₹10 crore. Catches typos, allows bulk lots. */
export const MAX_PAISE = 10_00_00_000 * 100;

const whole = new Intl.NumberFormat(CURRENCY.locale, {
  style: "currency",
  currency: CURRENCY.code,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const fractional = new Intl.NumberFormat(CURRENCY.locale, {
  style: "currency",
  currency: CURRENCY.code,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const plain = new Intl.NumberFormat(CURRENCY.locale, { maximumFractionDigits: 0 });

export const rupees = (paise: Paise) => paise / 100;
export const toPaise = (rupeeAmount: number) => Math.round(rupeeAmount * 100);

/** ₹1,25,000 — whole rupees drop the decimals, odd paise keep two places. */
export function formatINR(
  paise: Paise | null | undefined,
  opts: { fallback?: string; signed?: boolean } = {},
): string {
  if (paise == null || !Number.isFinite(paise)) return opts.fallback ?? "—";
  const abs = Math.abs(Math.round(paise));
  const body = (abs % 100 === 0 ? whole : fractional).format(abs / 100);
  if (paise < 0) return `−${body}`;
  if (opts.signed && paise > 0) return `+${body}`;
  return body;
}

/** Short Indian-style amounts for chart axes: ₹950, ₹25K, ₹1.25L, ₹2.4Cr. */
export function compactINR(paise: Paise | null | undefined): string {
  if (paise == null || !Number.isFinite(paise)) return "—";
  const sign = paise < 0 ? "−" : "";
  const r = Math.abs(paise) / 100;
  const trim = (n: number, digits: number) =>
    n.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  if (r < 1_000) return `${sign}₹${Math.round(r)}`;
  if (r < 1_00_000) return `${sign}₹${trim(r / 1_000, 1)}K`;
  if (r < 1_00_00_000) return `${sign}₹${trim(r / 1_00_000, 2)}L`;
  return `${sign}₹${trim(r / 1_00_00_000, 2)}Cr`;
}

export function formatNumber(n: number | null | undefined, fallback = "—"): string {
  if (n == null || !Number.isFinite(n)) return fallback;
  return plain.format(n);
}

export function formatPct(pct: number | null | undefined, opts: { signed?: boolean } = {}): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const abs = Math.abs(pct);
  const body = `${abs >= 100 ? abs.toFixed(0) : abs.toFixed(1)}%`;
  if (pct < 0) return `−${body}`;
  if (opts.signed && pct > 0) return `+${body}`;
  return body;
}

export type ParseResult = { ok: true; value: Paise | null } | { ok: false; error: string };

const SUFFIX: Record<string, number> = {
  k: 1_000,
  l: 1_00_000,
  lac: 1_00_000,
  lakh: 1_00_000,
  lakhs: 1_00_000,
  cr: 1_00_00_000,
  crore: 1_00_00_000,
  crores: 1_00_00_000,
};

/**
 * Parses what people actually type: "1,25,000", "₹ 39999", "25k", "1.2L", "1.5 lakh".
 * Empty input is a valid "no amount" (null).
 */
export function parseINR(input: string): ParseResult {
  const raw = input.trim().toLowerCase().replace(/^(₹|rs\.?|inr)\s*/, "").replace(/[\s,_]/g, "");
  if (raw === "") return { ok: true, value: null };
  const match = raw.match(/^(\d+(?:\.\d+)?)([a-z]*)$/);
  if (!match) return { ok: false, error: "Use numbers only, like 24999 or 1.2L" };
  const [, num, suffix] = match;
  let amount = Number(num);
  if (suffix) {
    const mult = SUFFIX[suffix];
    if (!mult) return { ok: false, error: `Unknown unit "${suffix}". Try K, L or Cr` };
    amount *= mult;
  } else if (/\.\d{3,}$/.test(num)) {
    return { ok: false, error: "Rupees take at most two decimal places" };
  }
  const paise = toPaise(amount);
  if (!Number.isFinite(paise)) return { ok: false, error: "That amount is not a number" };
  if (paise > MAX_PAISE) return { ok: false, error: "That is more than ₹10 crore. Check the amount" };
  return { ok: true, value: paise };
}

/** Value for a money <input>: plain rupees, no grouping, so it round-trips through parseINR. */
export function paiseToInput(paise: Paise | null | undefined): string {
  if (paise == null) return "";
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}
