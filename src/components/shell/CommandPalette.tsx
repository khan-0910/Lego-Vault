"use client";

import { ArrowRight, CornerDownLeft, Database, Gauge, Gift, House, LayoutGrid, Library, type LucideIcon, Plus, Search, Shapes } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { ThemeIcon } from "@/components/ui/ThemeIcon";
import { catalogHref } from "@/lib/catalog";
import { matchesQuery } from "@/lib/calc";
import { useThemes } from "@/lib/hooks";
import { formatINR } from "@/lib/money";
import { useVault } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { cn, normalise, textOn } from "@/lib/utils";

interface Item {
  id: string;
  group: "Actions" | "Sets" | "Themes" | "Catalog";
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

const actionIcon = (Icon: LucideIcon) => <Icon size={18} strokeWidth={2.6} aria-hidden />;

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPalette);
  const openAdd = useUI((s) => s.openAdd);
  const sets = useVault((s) => s.sets);
  const { themes, get } = useThemes();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const opener = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => input.current?.focus(), 20);
    return () => {
      clearTimeout(t);
      opener?.focus?.();
    };
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => router.push(href);
    const actions: Item[] = [
      { id: "add", group: "Actions", label: "Add a set", hint: "N", icon: actionIcon(Plus), run: () => openAdd() },
      { id: "hq", group: "Actions", label: "Go to HQ", icon: actionIcon(House), run: go("/") },
      { id: "vault", group: "Actions", label: "Open the vault", icon: actionIcon(LayoutGrid), run: go("/collection") },
      { id: "value", group: "Actions", label: "Open the value tracker", icon: actionIcon(Gauge), run: go("/value") },
      { id: "catalog", group: "Actions", label: "Browse every LEGO set", icon: actionIcon(Library), run: go("/catalog") },
      { id: "wish", group: "Actions", label: "Open wishlist", icon: actionIcon(Gift), run: go("/wishlist") },
      { id: "wish-add", group: "Actions", label: "Add to wishlist", icon: actionIcon(Gift), run: go("/wishlist?add=1") },
      { id: "themes", group: "Actions", label: "Manage themes", icon: actionIcon(Shapes), run: go("/themes") },
      { id: "data", group: "Actions", label: "Backup, import and export", icon: actionIcon(Database), run: go("/settings") },
    ];
    const query = normalise(q);
    const filteredActions = query ? actions.filter((a) => normalise(a.label).includes(query)) : actions.slice(0, 5);
    const setItems: Item[] = (query ? sets.filter((s) => matchesQuery(s, q, get(s.themeId).name)) : sets.slice(0, 4)).slice(0, 8).map((s) => {
      const t = get(s.themeId);
      return {
        id: s.id,
        group: "Sets",
        label: s.name,
        hint: [s.setNumber && `#${s.setNumber}`, s.purchasePrice != null && formatINR(s.purchasePrice), s.status === "sold" && "sold"].filter(Boolean).join(" · "),
        icon: (
          <span className="grid h-7 w-7 place-items-center rounded-md border-2 border-ink" style={{ background: t.color, color: textOn(t.color) }}>
            <ThemeIcon icon={t.icon} size={14} />
          </span>
        ),
        run: go(`/set?id=${s.id}`),
      };
    });
    const themeItems: Item[] = query
      ? themes
          .filter((t) => normalise(t.name).includes(query))
          .slice(0, 4)
          .map((t) => ({
            id: t.id,
            group: "Themes",
            label: t.name,
            hint: "show sets",
            icon: (
              <span className="grid h-7 w-7 place-items-center rounded-md border-2 border-ink" style={{ background: t.color, color: textOn(t.color) }}>
                <ThemeIcon icon={t.icon} size={14} />
              </span>
            ),
            run: go(`/collection?theme=${t.id}`),
          }))
      : [];
    const catalogItem: Item[] = query
      ? [{ id: "catalog-search", group: "Catalog", label: `Find “${q.trim()}” in every LEGO set`, hint: "catalog", icon: actionIcon(Library), run: go(catalogHref(q.trim())) }]
      : [];
    return [...setItems, ...themeItems, ...catalogItem, ...filteredActions];
  }, [q, sets, themes, get, openAdd, router]);

  const run = (item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    item.run();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75] flex items-start justify-center px-3 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-ink/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search and commands"
            initial={{ opacity: 0, y: -24, scale: 0.96, rotate: -1 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 520, damping: 32 }}
            className="panel relative w-full max-w-xl overflow-hidden"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "Tab") e.preventDefault();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(items.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                run(items[active]);
              }
            }}
          >
            <div className="flex items-center gap-3 border-b-[3px] border-ink bg-yellow px-4 py-3">
              <Search size={22} strokeWidth={3} aria-hidden />
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                placeholder="Search sets, set numbers, themes or actions…"
                className="min-w-0 flex-1 bg-transparent font-display text-lg font-bold placeholder:text-ink/50 focus:outline-none"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
                aria-autocomplete="list"
              />
              <kbd className="mono-meta rounded border-2 border-ink bg-paper px-1.5 py-0.5">Esc</kbd>
            </div>
            <ul id={listId} role="listbox" className="scroll-comic max-h-[55vh] overflow-y-auto p-2">
              {items.length === 0 && <li className="px-3 py-8 text-center font-medium text-ink/70">Nothing found for “{q}”.</li>}
              {items.map((item, i) => (
                <li key={`${item.group}-${item.id}`} role="presentation">
                  {(i === 0 || items[i - 1].group !== item.group) && <p className="mono-meta px-3 pb-1 pt-3 text-ink/55">{item.group}</p>}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => run(item)}
                    className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5", i === active && "bg-ink text-paper")}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center">{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{item.label}</span>
                    {item.hint && <span className={cn("mono-meta shrink-0", i === active ? "text-paper/70" : "text-ink/55")}>{item.hint}</span>}
                    {i === active && (item.group === "Actions" ? <CornerDownLeft size={16} aria-hidden /> : <ArrowRight size={16} aria-hidden />)}
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
