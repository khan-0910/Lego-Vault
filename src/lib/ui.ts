import { create } from "zustand";
import type { ItemKind, Paise } from "./types";
import { uid } from "./utils";

/** Transient UI state. Never persisted. */

export interface SetPrefill {
  kind?: ItemKind;
  name?: string;
  setNumber?: string;
  themeId?: string | null;
  /** Used when there is no themeId: matched to one of the user's themes, or offered as a new one. */
  themeName?: string;
  pieces?: number | null;
  purchasePrice?: Paise | null;
}

export interface Toast {
  id: string;
  kind: "cash" | "success" | "info" | "error";
  title: string;
  body?: string;
  action?: { label: string; run: () => void };
  link?: { label: string; href: string };
}

export interface Pulse {
  themeIds: string[];
  delta: Paise;
  at: number;
}

interface UIState {
  form: { open: boolean; editId: string | null; prefill: SetPrefill | null; wishId: string | null };
  openAdd: (prefill?: SetPrefill, wishId?: string) => void;
  openEdit: (id: string) => void;
  closeForm: () => void;
  paletteOpen: boolean;
  setPalette: (open: boolean) => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  /** Last money change, so dashboards can flash the theme that moved. */
  pulse: Pulse | null;
  setPulse: (themeIds: string[], delta: Paise) => void;
}

export const useUI = create<UIState>((set, get) => ({
  form: { open: false, editId: null, prefill: null, wishId: null },
  openAdd: (prefill, wishId) => set({ form: { open: true, editId: null, prefill: prefill ?? null, wishId: wishId ?? null } }),
  openEdit: (id) => set({ form: { open: true, editId: id, prefill: null, wishId: null } }),
  closeForm: () => set((s) => ({ form: { ...s.form, open: false } })),
  paletteOpen: false,
  setPalette: (paletteOpen) => set({ paletteOpen }),
  toasts: [],
  toast: (t) => {
    const id = uid("t");
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => get().dismiss(id), t.action ? 7000 : 4500);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  pulse: null,
  setPulse: (themeIds, delta) => set({ pulse: { themeIds, delta, at: Date.now() } }),
}));

export const toast = (t: Omit<Toast, "id">) => useUI.getState().toast(t);
