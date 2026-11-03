"use client";

import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { setImage, suggestByName, useCatalog, useFigs } from "@/lib/catalog";
import type { ItemKind } from "@/lib/types";
import { cn } from "@/lib/utils";

/** What the add form needs from a catalog set or minifigure. */
export interface Pickable {
  num: string;
  name: string;
  year: number;
  theme: string;
  pieces: number;
  /** Minifigures only: sets it comes in. */
  sets?: string[];
}

/**
 * Name field that suggests matching sets or minifigures from the catalog as you type.
 * Typing anything is still fine: picking a suggestion is optional and only fills fields in.
 */
export function NamePicker({
  kind,
  value,
  onChange,
  onPick,
  id,
  describedBy,
  invalid,
  onBlur,
  placeholder,
}: {
  kind: ItemKind;
  value: string;
  onChange: (v: string) => void;
  onPick: (item: Pickable) => void;
  id: string;
  describedBy?: string;
  invalid?: boolean;
  onBlur?: () => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [place, setPlace] = useState<CSSProperties | null>(null);
  // The catalog files are big, so they load only once the user starts typing a name.
  const [wanted, setWanted] = useState(false);
  const sets = useCatalog(wanted && kind === "set");
  const figs = useFigs(wanted && kind === "minifig");
  const loading = wanted && value.trim().length >= 2 && !(kind === "set" ? sets.data || sets.error : figs.data || figs.error);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const up = below < 260 && above > below;
      setPlace({
        position: "fixed",
        left: r.left,
        width: r.width,
        maxHeight: Math.min(360, (up ? above : below) - 8),
        ...(up ? { bottom: window.innerHeight - r.top + 8 } : { top: r.bottom + 8 }),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const options = useMemo<Pickable[]>(() => {
    if (kind === "set") return sets.data ? suggestByName(sets.data.sets.filter((s) => !s.extra), value) : [];
    return figs.data ? suggestByName(figs.data.figs, value) : [];
  }, [kind, sets.data, figs.data, value]);

  const pick = (o: Pickable) => {
    onPick(o);
    setOpen(false);
  };

  const showList = open && place && (options.length > 0 || loading);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        data-autofocus
        className="input font-display text-lg font-bold"
        role="combobox"
        aria-expanded={Boolean(showList)}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        maxLength={140}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value.trim().length >= 2) setWanted(true);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
          onBlur?.();
        }}
        onKeyDown={(e) => {
          const move = (to: number) => {
            setActive(to);
            document.getElementById(`${listId}-${to}`)?.scrollIntoView({ block: "nearest" });
          };
          if (e.key === "ArrowDown" && options.length) {
            e.preventDefault();
            setOpen(true);
            move(Math.min(options.length - 1, active + 1));
          } else if (e.key === "ArrowUp" && options.length) {
            e.preventDefault();
            move(Math.max(0, active - 1));
          } else if (e.key === "Enter" && open && options[active]) {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape" && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showList && (
              <motion.ul
                id={listId}
                role="listbox"
                aria-label={kind === "set" ? "Matching LEGO sets" : "Matching minifigures"}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0 } }}
                transition={{ type: "spring", stiffness: 600, damping: 34 }}
                style={place}
                className="panel scroll-comic z-[90] overflow-y-auto p-1.5"
              >
                <li role="presentation">
                  <p className="mono-meta px-2.5 pb-1 pt-2 opacity-60">{loading ? "Searching the catalog…" : kind === "set" ? "From the set catalog" : "From the minifigure catalog"}</p>
                </li>
                {options.map((o, i) => (
                  <li key={o.num} role="presentation">
                    <div
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(o)}
                      className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5", i === active && "bg-yellow")}
                    >
                      <Thumb num={o.num} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold leading-tight">{o.name}</span>
                        <span className="mono-meta block truncate text-[0.6rem] text-ink/60">
                          {[o.num, o.theme, o.year || null, o.sets ? `in ${o.sets.length} ${o.sets.length === 1 ? "set" : "sets"}` : null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

function Thumb({ num }: { num: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="grid h-10 w-12 shrink-0 place-items-center overflow-hidden rounded-md border-2 border-ink bg-paper" aria-hidden>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={setImage(num)} alt="" loading="lazy" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      )}
    </span>
  );
}
