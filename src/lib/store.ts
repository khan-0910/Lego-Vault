import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Backup } from "./schema";
import { formatINR } from "./money";
import { clearPhotos, deletePhotos, putPhoto, dataURLToBlob } from "./photos";
import { CONDITIONS, findStarter, presetForCustom } from "./themes";
import type {
  LegoSet,
  Paise,
  Prefs,
  SetEvent,
  SetInput,
  Theme,
  WishInput,
  WishItem,
} from "./types";
import { refreshColor } from "./palette";
import { toast } from "./ui";
import { normalise, nowISO, todayISO, uid } from "./utils";

/*
 * The vault. All collection data lives here and is persisted to localStorage
 * (photos go to IndexedDB, see photos.ts). Stats are never stored: pages derive
 * them from `sets` with lib/calc, so every CRUD change is reflected instantly.
 */

export interface VaultData {
  sets: LegoSet[];
  themes: Theme[];
  wishlist: WishItem[];
  prefs: Prefs;
}

interface VaultActions {
  addSet: (input: SetInput) => LegoSet;
  updateSet: (id: string, input: SetInput) => void;
  deleteSet: (id: string) => LegoSet | null;
  restoreDeleted: (set: LegoSet, index: number) => void;
  updateValue: (id: string, value: Paise | null) => void;
  markSold: (id: string, sale: { price: Paise | null; date: string | null }) => void;
  unmarkSold: (id: string) => void;
  addPhotos: (id: string, photoIds: string[]) => void;
  removePhoto: (id: string, photoId: string) => void;
  makeCover: (id: string, photoId: string) => void;

  ensureTheme: (name: string) => string;
  createTheme: (t: Pick<Theme, "name" | "color" | "pattern" | "icon">) => string | null;
  updateTheme: (id: string, patch: Partial<Pick<Theme, "name" | "color" | "pattern" | "icon">>) => boolean;
  deleteTheme: (id: string, moveTo: string | null) => void;
  mergeThemes: (fromId: string, intoId: string) => void;

  addWish: (input: WishInput) => void;
  updateWish: (id: string, input: WishInput) => void;
  deleteWish: (id: string) => void;

  setPrefs: (patch: Partial<Prefs>) => void;
  loadDemo: (demo: { sets: LegoSet[]; themes: Theme[]; wishlist: WishItem[] }) => void;
  clearDemo: () => void;
  importBackup: (backup: Backup, mode: "replace" | "merge") => Promise<void>;
  importSets: (rows: Array<SetInput & { themeName: string }>) => number;
  eraseAll: () => Promise<void>;
}

export type Vault = VaultData & VaultActions;

export const DEFAULT_PREFS: Prefs = {
  view: "grid",
  sort: "recent",
  cardFields: ["pieces", "price", "value", "gain", "condition"],
  motion: "system",
};

const ev = (type: SetEvent["type"], label: string, extra: Partial<SetEvent> = {}): SetEvent => ({
  id: uid("ev"),
  type,
  at: nowISO(),
  label,
  ...extra,
});

function creationEvents(input: SetInput): SetEvent[] {
  const events: SetEvent[] = [ev("added", "Added to the vault")];
  if (input.purchaseDate) {
    const bits = [input.seller && `from ${input.seller}`, input.purchasePrice != null && `for ${formatINR(input.purchasePrice)}`];
    events.push(
      ev("purchased", ["Bought", ...bits.filter(Boolean)].join(" "), {
        at: input.purchaseDate,
        to: input.purchasePrice,
      }),
    );
  }
  if (input.marketValue != null) events.push(ev("value", "First value estimate", { from: null, to: input.marketValue }));
  return events;
}

const FIELD_NAMES: Partial<Record<keyof SetInput, string>> = {
  name: "name",
  setNumber: "set number",
  themeId: "theme",
  pieces: "piece count",
  purchaseDate: "purchase date",
  seller: "seller",
  notes: "notes",
};

/** Turns an edit into readable history entries instead of one vague "edited". */
function diffEvents(prev: LegoSet, next: SetInput): SetEvent[] {
  const events: SetEvent[] = [];
  if (prev.purchasePrice !== next.purchasePrice)
    events.push(ev("price", "Purchase price changed", { from: prev.purchasePrice, to: next.purchasePrice }));
  if (prev.marketValue !== next.marketValue)
    events.push(ev("value", "Value estimate updated", { from: prev.marketValue, to: next.marketValue }));
  if (prev.condition !== next.condition)
    events.push(
      ev("condition", `Condition: ${CONDITIONS[prev.condition].label} → ${CONDITIONS[next.condition].label}`, {
        from: prev.condition,
        to: next.condition,
      }),
    );
  const added = next.photoIds.filter((p) => !prev.photoIds.includes(p)).length;
  if (added) events.push(ev("photo", `Added ${added} photo${added > 1 ? "s" : ""}`));
  const changed = (Object.keys(FIELD_NAMES) as Array<keyof SetInput>).filter((k) => prev[k] !== next[k]);
  if (changed.length) events.push(ev("edited", `Edited ${changed.map((k) => FIELD_NAMES[k]).join(", ")}`));
  return events;
}

let quotaWarned = false;

const storage = createJSONStorage<Partial<VaultData>>(() => ({
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      if (!quotaWarned) {
        quotaWarned = true;
        toast({
          kind: "error",
          title: "Could not save",
          body: "This browser's storage is full or blocked. Export a backup from Data before you continue.",
        });
      }
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* storage blocked: nothing to remove */
    }
  },
}));

export const useVault = create<Vault>()(
  persist(
    (set, get) => {
      const patchSet = (id: string, fn: (s: LegoSet) => LegoSet) =>
        set((st) => ({ sets: st.sets.map((s) => (s.id === id ? { ...fn(s), updatedAt: nowISO() } : s)) }));

      const themeInUse = (id: string, st: VaultData) =>
        st.sets.some((s) => s.themeId === id) || st.wishlist.some((w) => w.themeId === id);

      return {
        sets: [],
        themes: [],
        wishlist: [],
        prefs: DEFAULT_PREFS,

        addSet: (input) => {
          const now = nowISO();
          const record: LegoSet = {
            ...input,
            id: uid("set"),
            marketValueAt: input.marketValue != null ? now : null,
            status: "owned",
            salePrice: null,
            saleDate: null,
            history: creationEvents(input),
            createdAt: now,
            updatedAt: now,
          };
          set((st) => ({ sets: [record, ...st.sets] }));
          return record;
        },

        updateSet: (id, input) =>
          patchSet(id, (s) => ({
            ...s,
            ...input,
            marketValueAt: s.marketValue !== input.marketValue ? nowISO() : s.marketValueAt,
            history: [...s.history, ...diffEvents(s, input)],
          })),

        deleteSet: (id) => {
          const target = get().sets.find((s) => s.id === id) ?? null;
          set((st) => ({ sets: st.sets.filter((s) => s.id !== id) }));
          // Photos are kept until the next start-up sweep, so Undo can bring them back.
          return target;
        },

        restoreDeleted: (record, index) =>
          set((st) => {
            if (st.sets.some((s) => s.id === record.id)) return st;
            const sets = [...st.sets];
            sets.splice(Math.min(index, sets.length), 0, record);
            return { sets };
          }),

        updateValue: (id, value) =>
          patchSet(id, (s) =>
            s.marketValue === value
              ? s
              : {
                  ...s,
                  marketValue: value,
                  marketValueAt: nowISO(),
                  history: [...s.history, ev("value", "Value estimate updated", { from: s.marketValue, to: value })],
                },
          ),

        markSold: (id, sale) =>
          patchSet(id, (s) => ({
            ...s,
            status: "sold",
            salePrice: sale.price,
            saleDate: sale.date ?? todayISO(),
            history: [
              ...s.history,
              ev("sold", sale.price != null ? `Sold for ${formatINR(sale.price)}` : "Marked as sold", {
                to: sale.price,
              }),
            ],
          })),

        unmarkSold: (id) =>
          patchSet(id, (s) => ({
            ...s,
            status: "owned",
            salePrice: null,
            saleDate: null,
            history: [...s.history, ev("restored", "Back in the vault (sale undone)")],
          })),

        addPhotos: (id, photoIds) =>
          patchSet(id, (s) => ({
            ...s,
            photoIds: [...s.photoIds, ...photoIds],
            history: [...s.history, ev("photo", `Added ${photoIds.length} photo${photoIds.length > 1 ? "s" : ""}`)],
          })),

        removePhoto: (id, photoId) => {
          patchSet(id, (s) => ({ ...s, photoIds: s.photoIds.filter((p) => p !== photoId) }));
          void deletePhotos([photoId]);
        },

        makeCover: (id, photoId) =>
          patchSet(id, (s) => ({ ...s, photoIds: [photoId, ...s.photoIds.filter((p) => p !== photoId)] })),

        ensureTheme: (name) => {
          const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
          const existing = get().themes.find((t) => normalise(t.name) === normalise(clean));
          if (existing) return existing.id;
          const starter = findStarter(clean);
          const theme: Theme = {
            id: uid("th"),
            name: starter?.name ?? clean,
            ...(starter
              ? { color: starter.color, pattern: starter.pattern, icon: starter.icon }
              : presetForCustom(clean, get().themes.length)),
            createdAt: nowISO(),
          };
          set((st) => ({ themes: [...st.themes, theme] }));
          return theme.id;
        },

        createTheme: (t) => {
          const name = t.name.trim().replace(/\s+/g, " ").slice(0, 40);
          if (!name || get().themes.some((x) => normalise(x.name) === normalise(name))) return null;
          const theme: Theme = { ...t, name, id: uid("th"), createdAt: nowISO() };
          set((st) => ({ themes: [...st.themes, theme] }));
          return theme.id;
        },

        updateTheme: (id, patch) => {
          if (patch.name != null) {
            const name = patch.name.trim().replace(/\s+/g, " ").slice(0, 40);
            if (!name || get().themes.some((x) => x.id !== id && normalise(x.name) === normalise(name))) return false;
            patch = { ...patch, name };
          }
          set((st) => ({ themes: st.themes.map((t) => (t.id === id ? { ...t, ...patch, demo: undefined } : t)) }));
          return true;
        },

        deleteTheme: (id, moveTo) =>
          set((st) => ({
            themes: st.themes.filter((t) => t.id !== id),
            sets: moveTo ? st.sets.map((s) => (s.themeId === id ? { ...s, themeId: moveTo, updatedAt: nowISO() } : s)) : st.sets,
            wishlist: st.wishlist.map((w) => (w.themeId === id ? { ...w, themeId: moveTo } : w)),
          })),

        mergeThemes: (fromId, intoId) => {
          if (fromId === intoId) return;
          get().deleteTheme(fromId, intoId);
        },

        addWish: (input) =>
          set((st) => ({ wishlist: [{ ...input, id: uid("wish"), createdAt: nowISO() }, ...st.wishlist] })),
        updateWish: (id, input) =>
          set((st) => ({ wishlist: st.wishlist.map((w) => (w.id === id ? { ...w, ...input } : w)) })),
        deleteWish: (id) => set((st) => ({ wishlist: st.wishlist.filter((w) => w.id !== id) })),

        setPrefs: (patch) => set((st) => ({ prefs: { ...st.prefs, ...patch } })),

        loadDemo: (demo) =>
          set((st) => {
            // Reuse the user's own theme if they already have one with the same name.
            const remap = new Map<string, string>();
            const themes = [...st.themes];
            for (const t of demo.themes) {
              const mine = themes.find((x) => normalise(x.name) === normalise(t.name));
              if (mine) remap.set(t.id, mine.id);
              else themes.push(t);
            }
            const fix = (id: string) => remap.get(id) ?? id;
            const ids = new Set(st.sets.map((s) => s.id));
            return {
              themes,
              sets: [...demo.sets.filter((s) => !ids.has(s.id)).map((s) => ({ ...s, themeId: fix(s.themeId) })), ...st.sets],
              wishlist: [
                ...demo.wishlist
                  .filter((w) => !st.wishlist.some((x) => x.id === w.id))
                  .map((w) => ({ ...w, themeId: w.themeId ? fix(w.themeId) : null })),
                ...st.wishlist,
              ],
            };
          }),

        clearDemo: () =>
          set((st) => {
            const sets = st.sets.filter((s) => !s.demo);
            const wishlist = st.wishlist.filter((w) => !w.demo);
            const themes = st.themes.filter((t) => !t.demo || themeInUse(t.id, { ...st, sets, wishlist }));
            return { sets, wishlist, themes };
          }),

        importBackup: async (backup, mode) => {
          if (backup.photos) {
            for (const [id, dataURL] of Object.entries(backup.photos)) {
              await putPhoto(await dataURLToBlob(dataURL), id);
            }
          }
          const data = {
            sets: backup.sets as LegoSet[],
            themes: backup.themes as Theme[],
            wishlist: backup.wishlist as WishItem[],
          };
          if (mode === "replace") {
            set(data);
            return;
          }
          set((st) => {
            const has = <T extends { id: string }>(list: T[]) => new Set(list.map((x) => x.id));
            const [s, t, w] = [has(st.sets), has(st.themes), has(st.wishlist)];
            return {
              sets: [...st.sets, ...data.sets.filter((x) => !s.has(x.id))],
              themes: [...st.themes, ...data.themes.filter((x) => !t.has(x.id))],
              wishlist: [...st.wishlist, ...data.wishlist.filter((x) => !w.has(x.id))],
            };
          });
        },

        importSets: (rows) => {
          const { ensureTheme, addSet } = get();
          for (const { themeName, ...row } of rows) addSet({ ...row, themeId: ensureTheme(themeName) });
          return rows.length;
        },

        eraseAll: async () => {
          set({ sets: [], themes: [], wishlist: [] });
          await clearPhotos().catch(() => undefined);
        },
      };
    },
    {
      name: "brickvault:vault",
      version: 2,
      // v2: built-in theme colours moved to the toy-box palette.
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<VaultData>;
        if (version < 2 && Array.isArray(p.themes)) p.themes = p.themes.map((t) => ({ ...t, color: refreshColor(t.color) }));
        return p as VaultData;
      },
      storage,
      skipHydration: true,
      partialize: (s) => ({ sets: s.sets, themes: s.themes, wishlist: s.wishlist, prefs: s.prefs }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<VaultData>;
        return { ...current, ...p, prefs: { ...DEFAULT_PREFS, ...(p.prefs ?? {}) } };
      },
    },
  ),
);

/** Map lookup for themes; memoise on the themes array in components. */
export function themeMap(themes: Theme[]): Map<string, Theme> {
  return new Map(themes.map((t) => [t.id, t]));
}

export const FALLBACK_THEME: Theme = {
  id: "missing",
  name: "No theme",
  color: "#EFE4F5",
  pattern: "dots",
  icon: "blocks",
  createdAt: "",
};
