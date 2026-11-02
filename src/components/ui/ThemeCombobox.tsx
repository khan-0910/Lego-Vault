"use client";

import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useVault } from "@/lib/store";
import { STARTER_THEMES } from "@/lib/themes";
import type { IconKey } from "@/lib/types";
import { cn, normalise, textOn } from "@/lib/utils";
import { ThemeIcon } from "./ThemeIcon";

export interface ThemePick {
  themeId: string | null;
  name: string;
}

interface Option {
  kind: "mine" | "starter" | "create";
  id: string | null;
  name: string;
  color: string;
  icon: IconKey;
}

/**
 * Type any theme. Suggests the user's own themes first, then common LEGO themes,
 * and offers to create whatever was typed. Nothing is forced.
 */
export function ThemeCombobox({
  value,
  onChange,
  id,
  describedBy,
  invalid,
  placeholder = "Technic, Icons, My MOCs…",
}: {
  value: ThemePick;
  onChange: (v: ThemePick) => void;
  id: string;
  describedBy?: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const themes = useVault((s) => s.themes);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [place, setPlace] = useState<CSSProperties | null>(null);

  // The list lives in a portal so modals and scroll areas can't clip it.
  // It opens below the input, or above when there isn't room.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const up = below < 220 && above > below;
      setPlace({
        position: "fixed",
        left: r.left,
        width: r.width,
        maxHeight: Math.min(288, (up ? above : below) - 8),
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

  const options = useMemo<Option[]>(() => {
    const q = normalise(value.name);
    const mine: Option[] = themes
      .filter((t) => !q || normalise(t.name).includes(q))
      .map((t) => ({ kind: "mine", id: t.id, name: t.name, color: t.color, icon: t.icon }));
    const starters: Option[] = STARTER_THEMES.filter(
      (s) => !themes.some((t) => normalise(t.name) === normalise(s.name)) && (!q || normalise(s.name).includes(q)),
    )
      .slice(0, q ? 6 : 10)
      .map((s) => ({ kind: "starter", id: null, name: s.name, color: s.color, icon: s.icon }));
    const exact = [...mine, ...starters].some((o) => normalise(o.name) === q);
    const create: Option[] = q && !exact ? [{ kind: "create", id: null, name: value.name.trim().replace(/\s+/g, " "), color: "#FFFAF4", icon: "blocks" }] : [];
    return [...mine, ...starters, ...create];
  }, [themes, value.name]);

  const matched = value.themeId ? themes.find((t) => t.id === value.themeId) : STARTER_THEMES.find((s) => normalise(s.name) === normalise(value.name));

  const pick = (o: Option) => {
    onChange({ themeId: o.id, name: o.name });
    setOpen(false);
  };

  const onType = (text: string) => {
    const exact = themes.find((t) => normalise(t.name) === normalise(text));
    onChange({ themeId: exact?.id ?? null, name: text });
    setActive(0);
    setOpen(true);
  };

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md border-2 border-ink"
        style={{ background: matched?.color ?? "#FFFAF4", color: textOn(matched?.color ?? "#FFFAF4") }}
        aria-hidden
      >
        <ThemeIcon icon={matched?.icon ?? "blocks"} size={15} />
      </span>
      <input
        ref={inputRef}
        id={id}
        className="input pl-12"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value.name}
        onChange={(e) => onType(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          const move = (to: number) => {
            setActive(to);
            document.getElementById(`${listId}-${to}`)?.scrollIntoView({ block: "nearest" });
          };
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            move(Math.min(options.length - 1, active + 1));
          } else if (e.key === "ArrowUp") {
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
            {open && place && options.length > 0 && (
              <motion.ul
                id={listId}
                role="listbox"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0 } }}
                transition={{ type: "spring", stiffness: 600, damping: 34 }}
                style={place}
                className="panel scroll-comic z-[90] overflow-y-auto p-1.5"
              >
                {options.map((o, i) => {
                  const header =
                    (i === 0 || options[i - 1].kind !== o.kind) && { mine: "Your themes", starter: "Common LEGO themes", create: "New theme" }[o.kind];
                  return (
                    <li key={`${o.kind}-${o.name}`} role="presentation">
                      {header && <p className="mono-meta px-2.5 pb-1 pt-2 opacity-60">{header}</p>}
                      <div
                        id={`${listId}-${i}`}
                        role="option"
                        aria-selected={i === active}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => pick(o)}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.95rem] font-semibold",
                          i === active && "bg-yellow",
                        )}
                      >
                        {o.kind === "create" ? (
                          <span className="grid h-6 w-6 place-items-center rounded-md border-2 border-dashed border-ink" aria-hidden>
                            <Plus size={14} strokeWidth={3} />
                          </span>
                        ) : (
                          <span
                            className="grid h-6 w-6 place-items-center rounded-md border-2 border-ink"
                            style={{ background: o.color, color: textOn(o.color) }}
                            aria-hidden
                          >
                            <ThemeIcon icon={o.icon} size={13} />
                          </span>
                        )}
                        <span className="truncate">{o.kind === "create" ? `Create “${o.name}”` : o.name}</span>
                      </div>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
