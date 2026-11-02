"use client";

import { ArrowLeft, ArrowRight, Check, RotateCcw, Save } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Delta } from "@/components/sets/SetBits";
import { Field, MoneyInput } from "@/components/ui/Fields";
import { Modal } from "@/components/ui/Modal";
import { ThemeCombobox, type ThemePick } from "@/components/ui/ThemeCombobox";
import { computeStats, inScope } from "@/lib/calc";
import { DRAFT_KEY } from "@/lib/hooks";
import { formatINR, paiseToInput, parseINR } from "@/lib/money";
import { useVault } from "@/lib/store";
import { CONDITION_ORDER, CONDITIONS } from "@/lib/themes";
import type { Condition, LegoSet, SetInput } from "@/lib/types";
import { type SetPrefill, toast, useUI } from "@/lib/ui";
import { cn, isISODate, normalise, todayISO } from "@/lib/utils";
import { PhotoUploader } from "./PhotoUploader";
import { CatalogImage } from "@/components/catalog/CatalogCard";
import { type CatalogSet, findSet, useCatalog, vaultThemeName } from "@/lib/catalog";

interface Draft {
  name: string;
  setNumber: string;
  theme: ThemePick;
  pieces: string;
  price: string;
  date: string;
  seller: string;
  condition: Condition;
  value: string;
  notes: string;
  photoIds: string[];
}

type Errors = Partial<Record<keyof Draft, string>>;

const STEPS = [
  { title: "The set", blurb: "What did you get?", tone: "#FFD447", fields: ["name", "theme", "setNumber", "pieces"] },
  { title: "The deal", blurb: "What did it cost?", tone: "#7BF1C8", fields: ["price", "date", "seller", "condition"] },
  { title: "The value", blurb: "What is it worth?", tone: "#FF9FD0", fields: ["value", "notes"] },
  { title: "Photos", blurb: "Show it off", tone: "#62D2FF", fields: ["photoIds"] },
] as const;

const emptyDraft = (): Draft => ({
  name: "",
  setNumber: "",
  theme: { themeId: null, name: "" },
  pieces: "",
  price: "",
  date: "",
  seller: "",
  condition: "sealed",
  value: "",
  notes: "",
  photoIds: [],
});

function fromSet(s: LegoSet, themeName: string): Draft {
  return {
    name: s.name,
    setNumber: s.setNumber,
    theme: { themeId: s.themeId, name: themeName },
    pieces: s.pieces == null ? "" : String(s.pieces),
    price: paiseToInput(s.purchasePrice),
    date: s.purchaseDate ?? "",
    seller: s.seller,
    condition: s.condition,
    value: paiseToInput(s.marketValue),
    notes: s.notes,
    photoIds: s.photoIds,
  };
}

function validate(d: Draft): Errors {
  const e: Errors = {};
  if (!d.name.trim()) e.name = "Give the set a name, like “Lion Knights’ Castle”";
  else if (d.name.length > 120) e.name = "Keep the name under 120 characters";
  if (!d.theme.name.trim()) e.theme = "Pick a theme or type a new one";
  else if (d.theme.name.trim().length > 40) e.theme = "Keep theme names under 40 characters";
  if (d.setNumber && !/^[A-Za-z0-9.\-]{1,24}$/.test(d.setNumber.trim())) e.setNumber = "Letters, numbers and dashes only, like 10305 or 75331-1";
  if (d.pieces.trim()) {
    const n = Number(d.pieces.replace(/,/g, ""));
    if (!Number.isInteger(n) || n < 0 || n > 100_000) e.pieces = "Use a whole number of pieces";
  }
  const price = parseINR(d.price);
  if (!price.ok) e.price = price.error;
  const value = parseINR(d.value);
  if (!value.ok) e.value = value.error;
  if (d.date) {
    if (!isISODate(d.date)) e.date = "That date does not look right";
    else if (d.date > todayISO()) e.date = "Purchase date cannot be in the future";
    else if (d.date < "1949-01-01") e.date = "LEGO bricks did not exist before 1949";
  }
  if (d.seller.length > 80) e.seller = "Keep seller under 80 characters";
  if (d.notes.length > 4000) e.notes = "Notes are limited to 4,000 characters";
  return e;
}

function toInput(d: Draft, themeId: string): SetInput {
  const price = parseINR(d.price);
  const value = parseINR(d.value);
  return {
    name: d.name.trim().replace(/\s+/g, " "),
    setNumber: d.setNumber.trim(),
    themeId,
    pieces: d.pieces.trim() ? Number(d.pieces.replace(/,/g, "")) : null,
    purchasePrice: price.ok ? price.value : null,
    purchaseDate: d.date || null,
    seller: d.seller.trim(),
    condition: d.condition,
    marketValue: value.ok ? value.value : null,
    notes: d.notes.trim(),
    photoIds: d.photoIds,
  };
}

export function SetFormModal() {
  const form = useUI((s) => s.form);
  const close = useUI((s) => s.closeForm);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (form.open) setStep(0);
  }, [form.open]);
  return (
    <Modal
      open={form.open}
      onClose={close}
      size="lg"
      tone={STEPS[step].tone}
      eyebrow={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step].blurb}`}
      title={form.editId ? "Edit set" : "Add a set"}
    >
      <SetFormBody key={`${form.editId ?? "new"}-${form.open}`} editId={form.editId} prefill={form.prefill} wishId={form.wishId} step={step} setStep={setStep} />
    </Modal>
  );
}

function SetFormBody({
  editId,
  prefill,
  wishId,
  step,
  setStep,
}: {
  editId: string | null;
  prefill: SetPrefill | null;
  wishId: string | null;
  step: number;
  setStep: (n: number) => void;
}) {
  const sets = useVault((s) => s.sets);
  const themes = useVault((s) => s.themes);
  const close = useUI((s) => s.closeForm);
  const editing = editId ? sets.find((s) => s.id === editId) : undefined;

  const [draft, setDraft] = useState<Draft>(() => {
    if (editing) return fromSet(editing, themes.find((t) => t.id === editing.themeId)?.name ?? "");
    if (prefill) {
      const t = prefill.themeId ? themes.find((x) => x.id === prefill.themeId) : prefill.themeName ? themes.find((x) => normalise(x.name) === normalise(prefill.themeName!)) : undefined;
      return {
        ...emptyDraft(),
        name: prefill.name ?? "",
        setNumber: prefill.setNumber ?? "",
        theme: t ? { themeId: t.id, name: t.name } : { themeId: null, name: prefill.themeName ?? "" },
        pieces: prefill.pieces ? String(prefill.pieces) : "",
        price: paiseToInput(prefill.purchasePrice ?? null),
        date: todayISO(),
      };
    }
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return { ...emptyDraft(), ...(JSON.parse(saved) as Partial<Draft>) };
    } catch {
      /* corrupt draft: start clean */
    }
    return emptyDraft();
  });
  const [restored] = useState(() => !editing && !prefill && JSON.stringify(draft) !== JSON.stringify(emptyDraft()));
  const [showErrors, setShowErrors] = useState<Set<keyof Draft>>(new Set());
  const [dir, setDir] = useState(1);
  const errors = useMemo(() => validate(draft), [draft]);

  // Autosave new-set drafts so a closed modal or refresh loses nothing.
  const firstRun = useRef(true);
  useEffect(() => {
    if (editing || prefill) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* storage full: drafts are best-effort */
      }
    }, 350);
    return () => clearTimeout(t);
  }, [draft, editing, prefill]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const err = (k: keyof Draft) => (showErrors.has(k) ? errors[k] : undefined);
  const touch = (k: keyof Draft) => setShowErrors((s) => new Set(s).add(k));

  const stepHasErrors = (i: number) => (STEPS[i].fields as readonly (keyof Draft)[]).some((f) => errors[f]);

  const focusNext = useRef(false);
  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    focusNext.current = true;
  };
  // Put the cursor in the new step's first field once it has mounted.
  const stepRef = (el: HTMLDivElement | null) => {
    if (!el || !focusNext.current) return;
    focusNext.current = false;
    el.querySelector<HTMLElement>("[data-autofocus], input, textarea")?.focus();
  };

  const next = () => {
    const fields = STEPS[step].fields as readonly (keyof Draft)[];
    setShowErrors((s) => new Set([...s, ...fields]));
    if (stepHasErrors(step)) return;
    go(Math.min(STEPS.length - 1, step + 1));
  };

  const duplicates = useMemo(() => {
    const n = draft.setNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (n.length < 3) return 0;
    return sets.filter((s) => s.id !== editId && s.setNumber.toLowerCase().replace(/[^a-z0-9]/g, "") === n).length;
  }, [draft.setNumber, sets, editId]);

  const sellers = useMemo(() => [...new Set(sets.map((s) => s.seller).filter(Boolean))].slice(0, 30), [sets]);

  const save = () => {
    setShowErrors(new Set(Object.keys(draft) as (keyof Draft)[]));
    const bad = STEPS.findIndex((_, i) => stepHasErrors(i));
    if (bad >= 0) {
      go(bad);
      return;
    }
    const store = useVault.getState();
    const themeId = draft.theme.themeId && store.themes.some((t) => t.id === draft.theme.themeId) ? draft.theme.themeId : store.ensureTheme(draft.theme.name);
    const input = toInput(draft, themeId);
    const themeName = useVault.getState().themes.find((t) => t.id === themeId)?.name ?? draft.theme.name;
    const ui = useUI.getState();

    if (editing) {
      const before = editing.purchasePrice ?? 0;
      store.updateSet(editing.id, input);
      const delta = (input.purchasePrice ?? 0) - before;
      if (delta !== 0 || editing.themeId !== themeId) ui.setPulse([...new Set([editing.themeId, themeId])], delta);
      toast({ kind: "success", title: "Saved changes", body: delta ? `Purchase price ${delta > 0 ? "up" : "down"} ${formatINR(Math.abs(delta))}. Totals updated.` : `${input.name} is up to date.` });
    } else {
      const created = store.addSet(input);
      if (wishId) store.deleteWish(wishId);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nothing to clear */
      }
      ui.setPulse([themeId], input.purchasePrice ?? 0);
      const total = computeStats(inScope(useVault.getState().sets, "owned")).totalSpent;
      toast({
        kind: input.purchasePrice ? "cash" : "success",
        title: input.purchasePrice ? `${formatINR(input.purchasePrice)} into ${themeName}` : `${input.name} is in the vault`,
        body: `${wishId ? "Moved from your wishlist. " : ""}Total spent is now ${formatINR(total)}.`,
        link: { label: "View set", href: `/set?id=${created.id}` },
      });
    }
    close();
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setDraft(emptyDraft());
    setShowErrors(new Set());
  };

  const price = parseINR(draft.price);
  const value = parseINR(draft.value);
  const preview = price.ok && value.ok && price.value != null && value.value != null ? { delta: value.value - price.value, pct: price.value > 0 ? ((value.value - price.value) / price.value) * 100 : null } : null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (step < STEPS.length - 1) next();
        else save();
      }}
      className="flex flex-col"
    >
      <ol className="grid grid-cols-4 gap-2 border-b-[3px] border-ink bg-cream px-4 py-3 sm:px-5" aria-label="Steps">
        {STEPS.map((s, i) => {
          const done = i < step && !stepHasErrors(i);
          const current = i === step;
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "relative flex w-full items-center justify-center gap-1.5 rounded-lg border-[2.5px] border-ink px-1.5 py-2 font-display text-[0.72rem] font-extrabold uppercase leading-none tracking-wide transition-transform sm:text-[0.8rem]",
                  current ? "-rotate-1 shadow-comic-sm" : "bg-paper hover:-translate-y-0.5",
                )}
                style={current ? { background: s.tone } : done ? { background: "#7BF1C8" } : undefined}
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper text-[0.65rem]">
                  {done ? <Check size={11} strokeWidth={4} aria-label="done" /> : i + 1}
                </span>
                <span className="hidden truncate sm:inline">{s.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {restored && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-lg border-2 border-dashed border-ink bg-yellow/40 px-3 py-2 text-sm sm:mx-5">
          <span className="font-semibold">Picked up your unsaved draft.</span>
          <button type="button" className="btn btn-sm ml-auto bg-paper" onClick={discardDraft}>
            <RotateCcw size={14} strokeWidth={3} /> Start fresh
          </button>
        </div>
      )}

      <div className="relative min-h-[340px] overflow-hidden px-4 py-5 sm:px-5">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            ref={stepRef}
            custom={dir}
            initial={{ opacity: 0, x: dir * 50, rotate: dir * 1.2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: dir * -40, rotate: dir * -1, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="space-y-5"
          >
            {step === 0 && (
              <>
                <Field label="Set name" error={err("name")}>
                  {({ id, describedBy, invalid }) => (
                    <input
                      id={id}
                      data-autofocus
                      className="input font-display text-lg font-bold"
                      value={draft.name}
                      onChange={(e) => set("name", e.target.value)}
                      onBlur={() => touch("name")}
                      placeholder="Lion Knights' Castle"
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                      maxLength={140}
                      autoComplete="off"
                    />
                  )}
                </Field>
                <Field label="Theme" error={err("theme")} hint="Pick one of yours, a common LEGO theme, or type your own.">
                  {({ id, describedBy, invalid }) => (
                    <ThemeCombobox id={id} value={draft.theme} onChange={(v) => set("theme", v)} describedBy={describedBy} invalid={invalid} />
                  )}
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Set number"
                    optional
                    error={err("setNumber")}
                    hint={duplicates > 0 ? <span className="font-semibold text-blue">You already have {duplicates} of this set. Saving adds another copy.</span> : "Printed on the box, like 10305."}
                  >
                    {({ id, describedBy, invalid }) => (
                      <input
                        id={id}
                        className="input font-mono font-semibold"
                        value={draft.setNumber}
                        onChange={(e) => set("setNumber", e.target.value)}
                        onBlur={() => touch("setNumber")}
                        placeholder="10305"
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        autoComplete="off"
                      />
                    )}
                  </Field>
                  <CatalogMatch
                    number={draft.setNumber}
                    draft={draft}
                    onFill={(m) =>
                      setDraft((d) => ({
                        ...d,
                        name: m.name,
                        pieces: m.pieces ? String(m.pieces) : d.pieces,
                        theme: d.theme.name.trim() ? d.theme : (() => {
                          const name = vaultThemeName(m.theme);
                          const t = themes.find((x) => normalise(x.name) === normalise(name));
                          return t ? { themeId: t.id, name: t.name } : { themeId: null, name };
                        })(),
                      }))
                    }
                  />
                  <Field label="Pieces" optional error={err("pieces")}>
                    {({ id, describedBy, invalid }) => (
                      <input
                        id={id}
                        className="input font-mono font-semibold"
                        inputMode="numeric"
                        value={draft.pieces}
                        onChange={(e) => set("pieces", e.target.value)}
                        onBlur={() => touch("pieces")}
                        placeholder="4514"
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                      />
                    )}
                  </Field>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Purchase price" optional error={err("price")} hint="Counts toward your total spent. Try 34999, 35k or 1.2L.">
                    {({ id, describedBy, invalid }) => (
                      <MoneyInput id={id} data-autofocus value={draft.price} onChange={(v) => set("price", v)} onBlur={() => touch("price")} describedBy={describedBy} invalid={invalid} />
                    )}
                  </Field>
                  <Field label="Purchase date" optional error={err("date")}>
                    {({ id, describedBy, invalid }) => (
                      <div className="flex gap-2">
                        <input
                          id={id}
                          type="date"
                          className="input font-mono"
                          value={draft.date}
                          max={todayISO()}
                          min="1949-01-01"
                          onChange={(e) => set("date", e.target.value)}
                          onBlur={() => touch("date")}
                          aria-describedby={describedBy}
                          aria-invalid={invalid || undefined}
                        />
                        <button type="button" className="btn btn-sm shrink-0 self-center" onClick={() => set("date", todayISO())}>
                          Today
                        </button>
                      </div>
                    )}
                  </Field>
                </div>
                <Field label="Seller / retailer" optional error={err("seller")}>
                  {({ id, describedBy, invalid }) => (
                    <>
                      <input
                        id={id}
                        className="input"
                        list={`${id}-sellers`}
                        value={draft.seller}
                        onChange={(e) => set("seller", e.target.value)}
                        placeholder="LEGO Certified Store, Amazon.in, a friend…"
                        aria-describedby={describedBy}
                        aria-invalid={invalid || undefined}
                        maxLength={90}
                      />
                      <datalist id={`${id}-sellers`}>
                        {sellers.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </>
                  )}
                </Field>
                <fieldset>
                  <legend className="field-label">Condition</legend>
                  <div role="radiogroup" aria-label="Condition" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {CONDITION_ORDER.map((c, i) => {
                      const on = draft.condition === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => set("condition", c)}
                          className={cn(
                            "rounded-xl border-[2.5px] border-ink px-2 py-2.5 text-left transition-transform",
                            on ? "shadow-comic-sm" : "bg-paper hover:-translate-y-0.5",
                            i === 4 && "col-span-2 sm:col-span-1",
                          )}
                          style={on ? { background: CONDITIONS[c].color, transform: "rotate(-1.5deg)" } : undefined}
                        >
                          <span className="block font-mono text-[0.72rem] font-extrabold tracking-wider">{CONDITIONS[c].short}</span>
                          <span className="mt-0.5 block text-[0.72rem] leading-tight text-ink/75">{CONDITIONS[c].blurb}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            )}

            {step === 2 && (
              <>
                <Field
                  label="Estimated market value"
                  optional
                  error={err("value")}
                  hint="Your own estimate of what it would sell for today. BRICKVAULT does not fetch market prices, so this stays an estimate."
                >
                  {({ id, describedBy, invalid }) => (
                    <div className="space-y-2">
                      <MoneyInput id={id} data-autofocus value={draft.value} onChange={(v) => set("value", v)} onBlur={() => touch("value")} describedBy={describedBy} invalid={invalid} />
                      <div className="flex flex-wrap items-center gap-2">
                        {price.ok && price.value != null && (
                          <button type="button" className="chip" onClick={() => set("value", paiseToInput(price.value))}>
                            Same as paid
                          </button>
                        )}
                        {draft.value && (
                          <button type="button" className="chip" onClick={() => set("value", "")}>
                            No estimate
                          </button>
                        )}
                        {preview && <Delta delta={preview.delta} pct={preview.pct} showLabel />}
                      </div>
                    </div>
                  )}
                </Field>
                <Field label="Notes" optional error={err("notes")}>
                  {({ id, describedBy, invalid }) => (
                    <textarea
                      id={id}
                      className="input"
                      value={draft.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      placeholder="Box condition, missing pieces, where it is displayed, build memories…"
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                    />
                  )}
                </Field>
              </>
            )}

            {step === 3 && <PhotoUploader photoIds={draft.photoIds} onChange={(ids) => set("photoIds", ids)} name={draft.name} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t-[3px] border-ink bg-paper px-4 py-3 sm:px-5">
        {step > 0 ? (
          <button type="button" className="btn btn-sm" onClick={() => go(step - 1)}>
            <ArrowLeft size={16} strokeWidth={3} /> Back
          </button>
        ) : (
          <SummaryHint draft={draft} />
        )}
        <div className="ml-auto flex gap-3">
          {step < STEPS.length - 1 && (
            <button type="button" className="btn btn-sm" onClick={save}>
              <Save size={16} strokeWidth={2.8} /> Save now
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="submit" className="btn btn-sm btn-yellow">
              Next <ArrowRight size={16} strokeWidth={3} />
            </button>
          ) : (
            <button type="submit" className="btn btn-sm btn-red">
              <Save size={16} strokeWidth={2.8} /> {editing ? "Save changes" : "Add to vault"}
            </button>
          )}
        </div>
      </footer>
    </form>
  );
}

function SummaryHint({ draft }: { draft: Draft }): ReactNode {
  const ready = draft.name.trim() && draft.theme.name.trim();
  return <p className="hidden text-sm text-ink/65 sm:block">{ready ? "Name and theme are enough. Save now or add details." : "Only name and theme are required."}</p>;
}

/** Looks the set number up in the public catalog and offers to fill in the name, theme and pieces. */
function CatalogMatch({ number, draft, onFill }: { number: string; draft: Draft; onFill: (m: CatalogSet) => void }) {
  const wanted = /^[A-Za-z0-9.\-]{3,24}$/.test(number.trim());
  const { data: catalog } = useCatalog(wanted);
  const match = wanted && catalog ? findSet(catalog, number) : undefined;
  const filled = match && draft.name === match.name && (!match.pieces || draft.pieces === String(match.pieces));
  return (
    <AnimatePresence initial={false}>
      {match && (
        <motion.div
          key={match.num}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
          transition={{ type: "spring", stiffness: 480, damping: 30 }}
          className="flex items-center gap-3 rounded-xl border-[2.5px] border-ink bg-sky/40 p-2 sm:order-last sm:col-span-2"
          aria-live="polite"
        >
          <CatalogImage num={match.num} name="" className="h-14 w-16 shrink-0 rounded-lg border-2 border-ink" />
          <div className="min-w-0 flex-1">
            <p className="mono-meta text-[0.62rem] text-ink/60">Found in the catalog · {match.num}</p>
            <p className="truncate font-display font-extrabold leading-tight">{match.name}</p>
            <p className="text-[0.8rem] text-ink/70">
              {match.theme} · {match.year}
              {match.pieces ? ` · ${match.pieces.toLocaleString("en-IN")} pieces` : ""}
            </p>
          </div>
          {filled ? (
            <span className="chip shrink-0 bg-mint">
              <Check size={14} strokeWidth={3.5} aria-hidden /> Filled in
            </span>
          ) : (
            <button type="button" className="btn btn-sm btn-yellow shrink-0" onClick={() => onFill(match)}>
              Fill in details
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
