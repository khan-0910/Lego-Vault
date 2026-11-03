import { parseINR, paiseToInput } from "./money";
import type { Condition, LegoSet, SetInput, Theme } from "./types";
import { isISODate, todayISO } from "./utils";

export const CSV_COLUMNS = [
  "name",
  "set_number",
  "theme",
  "pieces",
  "purchase_price_inr",
  "purchase_date",
  "seller",
  "condition",
  "estimated_value_inr",
  "status",
  "sale_price_inr",
  "sale_date",
  "notes",
  "type",
] as const;

function cell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  // Guard against spreadsheet formula injection, then quote if needed.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function setsToCSV(sets: LegoSet[], themes: Map<string, Theme>): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const s of sets) {
    lines.push(
      [
        s.name,
        s.setNumber,
        themes.get(s.themeId)?.name ?? "",
        s.pieces,
        paiseToInput(s.purchasePrice),
        s.purchaseDate,
        s.seller,
        s.condition,
        paiseToInput(s.marketValue),
        s.status,
        paiseToInput(s.salePrice),
        s.saleDate,
        s.notes,
        s.kind ?? "set",
      ]
        .map(cell)
        .join(","),
    );
  }
  return lines.join("\r\n");
}

/** RFC 4180-ish parser: quoted fields, escaped quotes, CRLF or LF. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const ALIASES: Record<string, (typeof CSV_COLUMNS)[number]> = {
  name: "name",
  set_name: "name",
  set: "name",
  set_number: "set_number",
  number: "set_number",
  set_no: "set_number",
  theme: "theme",
  category: "theme",
  pieces: "pieces",
  piece_count: "pieces",
  purchase_price: "purchase_price_inr",
  purchase_price_inr: "purchase_price_inr",
  price: "purchase_price_inr",
  paid: "purchase_price_inr",
  purchase_date: "purchase_date",
  date: "purchase_date",
  seller: "seller",
  retailer: "seller",
  condition: "condition",
  estimated_value: "estimated_value_inr",
  estimated_value_inr: "estimated_value_inr",
  market_value: "estimated_value_inr",
  value: "estimated_value_inr",
  notes: "notes",
  type: "type",
  kind: "type",
};

const CONDITIONS: Condition[] = ["sealed", "opened", "built", "used", "incomplete"];

export interface CSVImport {
  rows: Array<SetInput & { themeName: string }>;
  errors: string[];
}

export function csvToSets(text: string): CSVImport {
  const table = parseCSV(text);
  if (table.length < 2) return { rows: [], errors: ["The file has no data rows."] };
  const header = table[0].map((h) => ALIASES[h.trim().toLowerCase().replace(/[\s-]+/g, "_")]);
  if (!header.includes("name")) return { rows: [], errors: ['Missing a "name" column.'] };
  const today = todayISO();
  const rows: CSVImport["rows"] = [];
  const errors: string[] = [];

  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (k: (typeof CSV_COLUMNS)[number]) => {
      const idx = header.indexOf(k);
      return idx >= 0 ? (cells[idx] ?? "").trim().replace(/^'(?=[=+\-@])/, "") : "";
    };
    const problems: string[] = [];
    const name = get("name");
    if (!name) problems.push("name is empty");
    const price = parseINR(get("purchase_price_inr"));
    if (!price.ok) problems.push(`price: ${price.error}`);
    const value = parseINR(get("estimated_value_inr"));
    if (!value.ok) problems.push(`value: ${value.error}`);
    const piecesRaw = get("pieces").replace(/,/g, "");
    const pieces = piecesRaw ? Number(piecesRaw) : null;
    if (pieces != null && (!Number.isInteger(pieces) || pieces < 0 || pieces > 100_000)) problems.push("pieces must be a whole number");
    const date = get("purchase_date");
    if (date && (!isISODate(date) || date > today)) problems.push("purchase_date must be YYYY-MM-DD and not in the future");
    const cond = (get("condition").toLowerCase() || "sealed") as Condition;
    if (!CONDITIONS.includes(cond)) problems.push(`condition must be one of ${CONDITIONS.join(", ")}`);
    if (problems.length) {
      errors.push(`Row ${line}: ${problems.join("; ")}`);
      return;
    }
    rows.push({
      kind: /^(mini)?fig/i.test(get("type")) ? "minifig" : "set",
      name: name.slice(0, 120),
      setNumber: get("set_number").slice(0, 24),
      themeName: get("theme") || "Unsorted",
      themeId: "",
      pieces,
      purchasePrice: price.ok ? price.value : null,
      purchaseDate: date || null,
      seller: get("seller").slice(0, 80),
      condition: cond,
      marketValue: value.ok ? value.value : null,
      notes: get("notes").slice(0, 4000),
      photoIds: [],
    });
  });
  return { rows, errors };
}

export function download(filename: string, content: string | Blob, type = "text/plain") {
  const blob = typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
