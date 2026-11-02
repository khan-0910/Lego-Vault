"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Field, MoneyInput, Segmented } from "@/components/ui/Fields";
import { ThemeIcon } from "@/components/ui/ThemeIcon";
import { activeFilterCount, DEFAULT_FILTERS } from "@/lib/calc";
import { paiseToInput, parseINR } from "@/lib/money";
import { CONDITION_ORDER, CONDITIONS } from "@/lib/themes";
import type { Condition, SetFilters, StatusScope, Theme } from "@/lib/types";
import { cn, textOn, todayISO } from "@/lib/utils";

export function Popover({ label, count, children, align = "left" }: { label: string; count?: number; children: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" className={cn("chip", count ? "bg-yellow" : "")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label}
        {!!count && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[0.68rem] text-paper">{count}</span>}
        <ChevronDown size={14} strokeWidth={3} className={cn("transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
            transition={{ type: "spring", stiffness: 600, damping: 34 }}
            className={cn("panel absolute top-[calc(100%+8px)] z-30 w-[min(20rem,calc(100vw-2rem))] p-3", align === "right" ? "right-0" : "left-0")}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

const DATE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "year", label: "This year" },
  { id: "12m", label: "Last 12 months" },
  { id: "custom", label: "Custom" },
] as const;

function presetOf(f: SetFilters): (typeof DATE_PRESETS)[number]["id"] {
  if (!f.from && !f.to) return "all";
  const today = todayISO();
  if (f.from === `${today.slice(0, 4)}-01-01` && !f.to) return "year";
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  if (f.from === todayISO(d) && !f.to) return "12m";
  return "custom";
}

export function FilterBar({
  filters,
  onChange,
  themes,
  showPrice = false,
  children,
}: {
  filters: SetFilters;
  onChange: (f: SetFilters) => void;
  themes: Theme[];
  showPrice?: boolean;
  children?: ReactNode;
}) {
  const set = (patch: Partial<SetFilters>) => onChange({ ...filters, ...patch });
  const [custom, setCustom] = useState(presetOf(filters) === "custom");
  const preset = custom ? "custom" : presetOf(filters);
  const [minText, setMinText] = useState(paiseToInput(filters.minPrice));
  const [maxText, setMaxText] = useState(paiseToInput(filters.maxPrice));
  const active = activeFilterCount(filters);

  const applyPreset = (id: (typeof DATE_PRESETS)[number]["id"]) => {
    setCustom(id === "custom");
    if (id === "all") set({ from: null, to: null });
    if (id === "year") set({ from: `${todayISO().slice(0, 4)}-01-01`, to: null });
    if (id === "12m") {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      set({ from: todayISO(d), to: null });
    }
  };

  const min = parseINR(minText);
  const max = parseINR(maxText);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Segmented<StatusScope>
          label="Ownership"
          value={filters.status}
          onChange={(status) => set({ status })}
          options={[
            { value: "owned", label: "In vault" },
            { value: "sold", label: "Sold" },
            { value: "all", label: "All" },
          ]}
        />
        <span className="mx-1 hidden h-6 w-[2px] bg-ink/20 sm:block" aria-hidden />
        <Popover label="Themes" count={filters.themeIds.length}>
          {themes.length === 0 ? (
            <p className="text-sm">No themes yet.</p>
          ) : (
            <ul className="scroll-comic max-h-64 space-y-1 overflow-y-auto" role="group" aria-label="Filter by theme">
              {themes.map((t) => {
                const on = filters.themeIds.includes(t.id);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => set({ themeIds: toggle(filters.themeIds, t.id) })}
                      className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left font-semibold hover:bg-yellow/40", on && "bg-yellow/60")}
                    >
                      <span className="grid h-6 w-6 place-items-center rounded-md border-2 border-ink" style={{ background: t.color, color: textOn(t.color) }} aria-hidden>
                        <ThemeIcon icon={t.icon} size={13} />
                      </span>
                      <span className="flex-1 truncate">{t.name}</span>
                      <span className={cn("grid h-5 w-5 place-items-center rounded border-2 border-ink", on && "bg-ink text-paper")} aria-hidden>
                        {on && <Check size={12} strokeWidth={4} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {filters.themeIds.length > 0 && (
            <button type="button" className="btn btn-sm mt-2 w-full" onClick={() => set({ themeIds: [] })}>
              Any theme
            </button>
          )}
        </Popover>
        <Popover label="Condition" count={filters.conditions.length}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by condition">
            {CONDITION_ORDER.map((c: Condition) => (
              <button
                key={c}
                type="button"
                aria-pressed={filters.conditions.includes(c)}
                onClick={() => set({ conditions: toggle(filters.conditions, c) })}
                className="chip"
              >
                <span className="h-3 w-3 rounded-full border-2 border-ink" style={{ background: CONDITIONS[c].color }} aria-hidden />
                {CONDITIONS[c].label}
              </button>
            ))}
          </div>
        </Popover>
        <Popover label="Purchase date" count={filters.from || filters.to ? 1 : 0}>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((p) => (
              <button key={p.id} type="button" className="chip" aria-pressed={preset === p.id} onClick={() => applyPreset(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Field label="From">
                {({ id }) => <input id={id} type="date" className="input px-2 text-sm" value={filters.from ?? ""} max={filters.to ?? todayISO()} onChange={(e) => set({ from: e.target.value || null })} />}
              </Field>
              <Field label="To">
                {({ id }) => <input id={id} type="date" className="input px-2 text-sm" value={filters.to ?? ""} min={filters.from ?? undefined} onChange={(e) => set({ to: e.target.value || null })} />}
              </Field>
            </div>
          )}
          <p className="mt-2 text-xs text-ink/60">Sets without a purchase date are hidden while a date filter is on.</p>
        </Popover>
        {showPrice && (
          <Popover label="Price" count={filters.minPrice != null || filters.maxPrice != null ? 1 : 0} align="right">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Min" error={min.ok ? null : min.error}>
                {({ id, invalid }) => (
                  <MoneyInput
                    id={id}
                    value={minText}
                    invalid={invalid}
                    onChange={(v) => {
                      setMinText(v);
                      const p = parseINR(v);
                      if (p.ok) set({ minPrice: p.value });
                    }}
                  />
                )}
              </Field>
              <Field label="Max" error={max.ok ? null : max.error}>
                {({ id, invalid }) => (
                  <MoneyInput
                    id={id}
                    value={maxText}
                    invalid={invalid}
                    onChange={(v) => {
                      setMaxText(v);
                      const p = parseINR(v);
                      if (p.ok) set({ maxPrice: p.value });
                    }}
                  />
                )}
              </Field>
            </div>
            <p className="mt-2 text-xs text-ink/60">Filters on price paid. Sets without a price are hidden while this is on.</p>
          </Popover>
        )}
        {active > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setCustom(false);
              setMinText("");
              setMaxText("");
              onChange({ ...DEFAULT_FILTERS, q: filters.q });
            }}
          >
            <X size={15} strokeWidth={3} /> Clear filters
          </button>
        )}
      </div>
      {(filters.themeIds.length > 0 || filters.conditions.length > 0) && (
        <div className="flex flex-wrap gap-2" aria-label="Active filters">
          {filters.themeIds.map((id) => {
            const t = themes.find((x) => x.id === id);
            if (!t) return null;
            return (
              <button key={id} type="button" onClick={() => set({ themeIds: filters.themeIds.filter((x) => x !== id) })} className="chip text-xs" style={{ background: t.color, color: textOn(t.color) }} aria-label={`Remove theme filter ${t.name}`}>
                {t.name} <X size={12} strokeWidth={3} aria-hidden />
              </button>
            );
          })}
          {filters.conditions.map((c) => (
            <button key={c} type="button" onClick={() => set({ conditions: filters.conditions.filter((x) => x !== c) })} className="chip text-xs" style={{ background: CONDITIONS[c].color }} aria-label={`Remove condition filter ${CONDITIONS[c].label}`}>
              {CONDITIONS[c].label} <X size={12} strokeWidth={3} aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
