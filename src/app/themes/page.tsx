"use client";

import { ArrowRight, Combine, Pencil, Plus, Trash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Field, Segmented } from "@/components/ui/Fields";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/States";
import { themeSurface } from "@/components/ui/ThemeBadge";
import { THEME_ICONS, ThemeIcon } from "@/components/ui/ThemeIcon";
import { computeStats } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import { useVault } from "@/lib/store";
import { ICON_KEYS, PATTERNS, patternStyle, STARTER_THEMES, SWATCHES } from "@/lib/themes";
import type { IconKey, PatternKey, Theme } from "@/lib/types";
import { toast } from "@/lib/ui";
import { cn, INK, normalise, pluralise, textOn } from "@/lib/utils";

type SortBy = "spent" | "name" | "count";

export default function ThemesPage() {
  const themes = useVault((s) => s.themes);
  const sets = useVault((s) => s.sets);
  const wishlist = useVault((s) => s.wishlist);
  const createTheme = useVault((s) => s.createTheme);
  const [editing, setEditing] = useState<Theme | "new" | null>(null);
  const [merging, setMerging] = useState<Theme | null>(null);
  const [deleting, setDeleting] = useState<Theme | null>(null);
  const [sort, setSort] = useState<SortBy>("spent");

  const stats = useMemo(() => {
    const owned = sets.filter((s) => s.status === "owned");
    return new Map(computeStats(owned).byTheme.map((t) => [t.themeId, t]));
  }, [sets]);
  const wishCount = (id: string) => wishlist.filter((w) => w.themeId === id).length;
  const allCount = (id: string) => sets.filter((s) => s.themeId === id).length;

  const sorted = useMemo(() => {
    const list = [...themes];
    if (sort === "name") return list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "count") return list.sort((a, b) => (stats.get(b.id)?.count ?? 0) - (stats.get(a.id)?.count ?? 0));
    return list.sort((a, b) => (stats.get(b.id)?.spent ?? 0) - (stats.get(a.id)?.spent ?? 0) || a.name.localeCompare(b.name));
  }, [themes, stats, sort]);

  const suggestions = STARTER_THEMES.filter((s) => !themes.some((t) => normalise(t.name) === normalise(s.name)));

  return (
    <div>
      <PageHeader
        kicker="Themes"
        title="Theme worlds"
        accent="#A77BFF"
        build="tree"
        fig={{ torso: "#A77BFF", legs: "#2FCB8A", print: "stripe", hat: "helmet", hatColor: "#FFD447", mood: "smirk" }}
        subtitle="Every set belongs to a theme, and each theme gets its own colour, print pattern and icon. Use LEGO's themes or invent your own: MOCs, Bricklink lots, “Kid's room”."
        actions={
          <button type="button" className="btn btn-red" onClick={() => setEditing("new")}>
            <Plus size={18} strokeWidth={3} /> New theme
          </button>
        }
      />

      {themes.length === 0 ? (
        <div className="panel mb-8">
          <EmptyState art="vault" title="No themes yet" body="Themes are created when you add a set, or right here. Start from a common LEGO theme below or make your own." />
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-xl font-extrabold">{pluralise(themes.length, "theme")}</p>
            <Segmented<SortBy>
              label="Sort themes"
              value={sort}
              onChange={setSort}
              options={[
                { value: "spent", label: "By spend" },
                { value: "count", label: "By sets" },
                { value: "name", label: "A–Z" },
              ]}
            />
          </div>
          <ul className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {sorted.map((t, i) => {
                const s = stats.get(t.id);
                const total = allCount(t.id);
                return (
                  <motion.li
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 24, rotate: i % 2 ? 2 : -2 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 300, damping: 24, delay: Math.min(i, 9) * 0.04 }}
                    className="panel group flex flex-col overflow-hidden"
                  >
                    <Link href={`/collection?theme=${t.id}`} className="relative block h-32 overflow-hidden border-b-[3px] border-ink" style={themeSurface(t)} aria-label={`Show ${t.name} sets`}>
                      <ThemeIcon icon={t.icon} className="absolute -right-4 -top-4 h-36 w-36 opacity-25 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" strokeWidth={2} />
                      <span className="absolute bottom-3 left-3 grid h-12 w-12 place-items-center rounded-xl border-[3px] border-ink bg-paper text-ink shadow-comic-sm transition-transform group-hover:-rotate-6">
                        <ThemeIcon icon={t.icon} size={24} />
                      </span>
                      <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border-2 border-ink bg-paper px-2 py-0.5 text-xs font-bold text-ink opacity-0 transition-opacity group-hover:opacity-100">
                        View sets <ArrowRight size={12} strokeWidth={3} aria-hidden />
                      </span>
                    </Link>
                    <div className="flex flex-1 flex-col gap-1 p-4">
                      <h2 className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight">{t.name}</h2>
                      <p className="mono-meta text-ink/60">
                        {pluralise(s?.count ?? 0, "set")} in vault
                        {total > (s?.count ?? 0) ? ` · ${total - (s?.count ?? 0)} sold` : ""}
                        {wishCount(t.id) ? ` · ${wishCount(t.id)} wished` : ""}
                      </p>
                      <dl className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border-2 border-ink bg-cream px-2 py-1.5">
                          <dt className="mono-meta text-[0.6rem] text-ink/60">Spent</dt>
                          <dd className="font-display font-extrabold">{formatINR(s?.spent ?? 0)}</dd>
                        </div>
                        <div className="rounded-lg border-2 border-ink bg-cream px-2 py-1.5">
                          <dt className="mono-meta text-[0.6rem] text-ink/60">Est. value</dt>
                          <dd className="font-display font-extrabold">{s?.valuedCount ? formatINR(s.value) : "—"}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="flex gap-2 border-t-[3px] border-ink bg-cream p-3">
                      <button type="button" className="btn btn-sm" onClick={() => setEditing(t)}>
                        <Pencil size={14} strokeWidth={2.8} /> Style
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => setMerging(t)} disabled={themes.length < 2}>
                        <Combine size={14} strokeWidth={2.8} /> Merge
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost ml-auto" onClick={() => setDeleting(t)} aria-label={`Delete ${t.name}`}>
                        <Trash size={15} strokeWidth={2.8} />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </>
      )}

      {suggestions.length > 0 && (
        <section aria-labelledby="starter-title" className="panel p-5">
          <h2 id="starter-title" className="label-tab -mt-9 mb-4 bg-yellow">
            Common LEGO themes
          </h2>
          <p className="mb-4 text-ink/75">Add a ready-styled theme in one click. They are only suggestions, nothing is added until you pick one.</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                className="chip"
                onClick={() => {
                  createTheme({ name: s.name, color: s.color, pattern: s.pattern, icon: s.icon });
                  toast({ kind: "success", title: `${s.name} added` });
                }}
              >
                <span className="grid h-5 w-5 place-items-center rounded border-2 border-ink" style={{ background: s.color, color: textOn(s.color) }} aria-hidden>
                  <ThemeIcon icon={s.icon} size={11} />
                </span>
                {s.name}
                <Plus size={13} strokeWidth={3} aria-hidden />
              </button>
            ))}
          </div>
        </section>
      )}

      <ThemeEditor theme={editing} onClose={() => setEditing(null)} />
      <MergeDialog theme={merging} onClose={() => setMerging(null)} />
      <DeleteDialog theme={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function ThemeEditor({ theme, onClose }: { theme: Theme | "new" | null; onClose: () => void }) {
  return (
    <Modal open={theme != null} onClose={onClose} title={theme === "new" ? "New theme" : "Style theme"} eyebrow="Theme worlds" tone="#A77BFF" size="lg">
      {theme != null && <EditorBody key={theme === "new" ? "new" : theme.id} theme={theme === "new" ? null : theme} onClose={onClose} />}
    </Modal>
  );
}

function EditorBody({ theme, onClose }: { theme: Theme | null; onClose: () => void }) {
  const [name, setName] = useState(theme?.name ?? "");
  const [color, setColor] = useState(theme?.color ?? SWATCHES[0]);
  const [pattern, setPattern] = useState<PatternKey>(theme?.pattern ?? "dots");
  const [icon, setIcon] = useState<IconKey>(theme?.icon ?? "blocks");
  const [error, setError] = useState<string | null>(null);
  const preview: Theme = { id: "preview", name: name || "Your theme", color, pattern, icon, createdAt: "" };

  return (
    <form
      noValidate
      className="grid gap-6 p-5 md:grid-cols-[1fr_220px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return setError("Give the theme a name");
        const store = useVault.getState();
        const ok = theme ? store.updateTheme(theme.id, { name, color, pattern, icon }) : store.createTheme({ name, color, pattern, icon }) != null;
        if (!ok) return setError("You already have a theme with that name");
        toast({ kind: "success", title: theme ? "Theme updated" : `${name.trim()} created` });
        onClose();
      }}
    >
      <div className="space-y-5">
        <Field label="Name" error={error}>
          {({ id, invalid }) => (
            <input
              id={id}
              data-autofocus
              className="input font-display text-lg font-bold"
              value={name}
              maxLength={40}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              aria-invalid={invalid || undefined}
              placeholder="My MOCs"
            />
          )}
        </Field>
        <fieldset>
          <legend className="field-label">Colour</legend>
          <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn("h-10 w-10 rounded-xl border-[3px] border-ink transition-transform", color === c ? "-rotate-6 scale-110 shadow-comic-sm" : "hover:-translate-y-0.5")}
                style={{ background: c }}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="field-label">Print pattern</legend>
          <div role="radiogroup" aria-label="Pattern" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {PATTERNS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={pattern === p}
                onClick={() => setPattern(p)}
                className={cn("flex h-14 items-end justify-center rounded-xl border-[3px] border-ink pb-1 transition-transform", pattern === p ? "-rotate-3 shadow-comic-sm" : "hover:-translate-y-0.5")}
                style={{ backgroundColor: color, ...patternStyle(p, textOn(color) !== INK) }}
              >
                <span className="rounded bg-paper px-1 font-mono text-[0.6rem] font-bold uppercase">{p}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="field-label">Icon</legend>
          <div role="radiogroup" aria-label="Icon" className="grid grid-cols-8 gap-1.5">
            {ICON_KEYS.map((k) => {
              const Icon = THEME_ICONS[k];
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={icon === k}
                  aria-label={k}
                  onClick={() => setIcon(k)}
                  className={cn("grid aspect-square place-items-center rounded-lg border-2", icon === k ? "border-ink bg-yellow shadow-comic-sm" : "border-transparent hover:border-ink/40")}
                >
                  <Icon size={18} strokeWidth={2.5} aria-hidden />
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>
      <div className="space-y-4">
        <p className="field-label">Preview</p>
        <motion.div layout className="panel overflow-hidden" key={`${color}-${pattern}`} initial={{ rotate: -3, scale: 0.95 }} animate={{ rotate: -1, scale: 1 }}>
          <div className="relative h-40" style={themeSurface(preview)}>
            <ThemeIcon icon={icon} className="absolute -right-3 -top-3 h-28 w-28 opacity-25" strokeWidth={2} />
            <span className="absolute bottom-3 left-3 grid h-12 w-12 place-items-center rounded-xl border-[3px] border-ink bg-paper text-ink shadow-comic-sm">
              <ThemeIcon icon={icon} size={24} />
            </span>
          </div>
          <p className="truncate border-t-[3px] border-ink px-3 py-2 font-display text-lg font-extrabold uppercase">{preview.name}</p>
        </motion.div>
        <div className="flex flex-col gap-2">
          <button type="submit" className="btn btn-red">
            {theme ? "Save theme" : "Create theme"}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function MergeDialog({ theme, onClose }: { theme: Theme | null; onClose: () => void }) {
  const themes = useVault((s) => s.themes);
  const sets = useVault((s) => s.sets);
  const [target, setTarget] = useState("");
  const others = themes.filter((t) => t.id !== theme?.id);
  const count = theme ? sets.filter((s) => s.themeId === theme.id).length : 0;
  return (
    <Modal open={theme != null} onClose={onClose} title={`Merge ${theme?.name ?? ""}`} eyebrow="Combine duplicates" tone="#62D2FF" size="sm">
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!theme || !target) return;
          const into = others.find((t) => t.id === target);
          useVault.getState().mergeThemes(theme.id, target);
          toast({ kind: "success", title: `Merged into ${into?.name}`, body: `${pluralise(count, "set")} moved. Totals recalculated.` });
          setTarget("");
          onClose();
        }}
      >
        <p>
          All {pluralise(count, "set")} and wishlist items in <strong>{theme?.name}</strong> move to the theme you pick. Then <strong>{theme?.name}</strong> is removed.
        </p>
        <Field label="Merge into">
          {({ id }) => (
            <select id={id} className="input" value={target} onChange={(e) => setTarget(e.target.value)} data-autofocus>
              <option value="">Choose a theme…</option>
              {others.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-blue" disabled={!target}>
            Merge
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({ theme, onClose }: { theme: Theme | null; onClose: () => void }) {
  const themes = useVault((s) => s.themes);
  const sets = useVault((s) => s.sets);
  const wishlist = useVault((s) => s.wishlist);
  const [target, setTarget] = useState("");
  const others = themes.filter((t) => t.id !== theme?.id);
  const setCount = theme ? sets.filter((s) => s.themeId === theme.id).length : 0;
  const wishCount = theme ? wishlist.filter((w) => w.themeId === theme.id).length : 0;
  const needsMove = setCount > 0;
  return (
    <Modal open={theme != null} onClose={onClose} title={`Delete ${theme?.name ?? ""}?`} eyebrow="Hold up!" tone="#FF5C6C" size="sm">
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!theme || (needsMove && !target)) return;
          useVault.getState().deleteTheme(theme.id, target || null);
          toast({ kind: "info", title: `${theme.name} deleted`, body: needsMove ? `${pluralise(setCount, "set")} moved.` : undefined });
          setTarget("");
          onClose();
        }}
      >
        {needsMove ? (
          <>
            <p>
              <strong>{theme?.name}</strong> still holds {pluralise(setCount, "set")}. Sets always need a theme, so pick where they should go.
            </p>
            {others.length === 0 ? (
              <p className="rounded-lg border-2 border-ink bg-yellow px-3 py-2 text-sm font-semibold">Create another theme first, then delete this one.</p>
            ) : (
              <Field label="Move sets to">
                {({ id }) => (
                  <select id={id} className="input" value={target} onChange={(e) => setTarget(e.target.value)} data-autofocus>
                    <option value="">Choose a theme…</option>
                    {others.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            )}
          </>
        ) : (
          <p>
            No sets use this theme.{wishCount ? ` ${pluralise(wishCount, "wishlist item")} will be left without a theme.` : ""}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn" onClick={onClose} data-autofocus={!needsMove || undefined}>
            Cancel
          </button>
          <button type="submit" className="btn btn-red" disabled={needsMove && !target}>
            Delete theme
          </button>
        </div>
      </form>
    </Modal>
  );
}
