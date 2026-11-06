import { z } from "zod";
import { MAX_PAISE } from "./money";
import { ICON_KEYS, PATTERNS } from "./themes";

/** Validation for anything that enters the vault from outside the form: backups and CSV. */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const paise = z.number().int().min(0).max(MAX_PAISE);
const condition = z.enum(["sealed", "opened", "built", "used", "incomplete"]);

const event = z.object({
  id: z.string(),
  type: z.enum(["added", "purchased", "value", "condition", "price", "edited", "photo", "sold", "restored"]),
  at: z.string(),
  label: z.string(),
  from: z.union([z.number(), z.string(), z.null()]).optional(),
  to: z.union([z.number(), z.string(), z.null()]).optional(),
});

export const setSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["set", "minifig"]).optional(),
  mrp: paise.nullable().optional(),
  name: z.string().trim().min(1).max(120),
  setNumber: z.string().max(24).default(""),
  themeId: z.string().min(1),
  pieces: z.number().int().min(0).max(100_000).nullable(),
  purchasePrice: paise.nullable(),
  purchaseDate: day.nullable(),
  seller: z.string().max(80).default(""),
  condition,
  marketValue: paise.nullable(),
  marketValueAt: z.string().nullable().default(null),
  notes: z.string().max(4000).default(""),
  photoIds: z.array(z.string()).default([]),
  status: z.enum(["owned", "sold"]).default("owned"),
  salePrice: paise.nullable().default(null),
  saleDate: day.nullable().default(null),
  history: z.array(event).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  demo: z.boolean().optional(),
});

export const themeSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  pattern: z.enum(PATTERNS as [string, ...string[]]),
  icon: z.enum(ICON_KEYS as [string, ...string[]]),
  createdAt: z.string(),
  demo: z.boolean().optional(),
});

export const wishSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  setNumber: z.string().max(24).default(""),
  themeId: z.string().nullable(),
  targetPrice: paise.nullable(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  link: z.string().max(500).default(""),
  notes: z.string().max(2000).default(""),
  createdAt: z.string(),
  demo: z.boolean().optional(),
});

export const backupSchema = z.object({
  app: z.literal("brickvault"),
  version: z.literal(1),
  exportedAt: z.string(),
  sets: z.array(setSchema),
  themes: z.array(themeSchema),
  wishlist: z.array(wishSchema).default([]),
  photos: z.record(z.string(), z.string()).optional(),
});

export type Backup = z.infer<typeof backupSchema>;

export function isSafeLink(url: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
