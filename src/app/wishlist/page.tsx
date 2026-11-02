"use client";

import { ExternalLink, Gift, PartyPopper, Pencil, Plus, Trash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Field, MoneyInput, Segmented } from "@/components/ui/Fields";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/States";
import { ThemeBadge } from "@/components/ui/ThemeBadge";
import { ThemeCombobox, type ThemePick } from "@/components/ui/ThemeCombobox";
import { useThemes } from "@/lib/hooks";
import { formatINR, paiseToInput, parseINR } from "@/lib/money";
import { isSafeLink } from "@/lib/schema";
import { useVault } from "@/lib/store";
import { PRIORITY_META } from "@/lib/themes";
import type { Priority, WishItem } from "@/lib/types";
import { toast, useUI } from "@/lib/ui";
import { pluralise } from "@/lib/utils";

export default function WishlistPage() {
  return (
    <Suspense>
      <Wishlist />
    </Suspense>
  );
}

function Wishlist() {
  const wishlist = useVault((s) => s.wishlist);
  const deleteWish = useVault((s) => s.deleteWish);
  const openAdd = useUI((s) => s.openAdd);
  const { get } = useThemes();
  const params = useSearchParams();
  const router = useRouter();
  const [editing, setEditing] = useState<WishItem | "new" | null>(null);
  const [confirm, setConfirm] = useState<WishItem | null>(null);
  const [only, setOnly] = useState<Priority | 0>(0);

  useEffect(() => {
    if (params.get("add") === "1") {
      setEditing("new");
      router.replace("/wishlist");
    }
  }, [params, router]);

  const sorted = useMemo(
    () => [...wishlist].filter((w) => !only || w.priority === only).sort((a, b) => b.priority - a.priority || b.createdAt.localeCompare(a.createdAt)),
    [wishlist, only],
  );
  const total = wishlist.reduce((s, w) => s + (w.targetPrice ?? 0), 0);
  const mustHave = wishlist.filter((w) => w.priority === 3).reduce((s, w) => s + (w.targetPrice ?? 0), 0);

  return (
    <div>
      <PageHeader
        kicker="Wishlist"
        title="The want list"
        accent="#FF9FD0"
        build="rocket"
        fig={{ torso: "#FF9FD0", legs: "#A77BFF", print: "star", mood: "wow", hat: "hair", hatColor: "#2A1F45" }}
        subtitle="Sets you are after. Wishlist prices never count as spending. When you buy one, hit “Got it!” and it moves into the vault."
        actions={
          <button type="button" className="btn btn-red" onClick={() => setEditing("new")}>
            <Plus size={18} strokeWidth={3} /> Add to wishlist
          </button>
        }
      />

      {wishlist.length === 0 ? (
        <div className="panel">
          <EmptyState art="wish" title="Nothing on the list" body="Add the sets you are saving up for, with a target price and how badly you want them.">
            <button type="button" className="btn btn-red" onClick={() => setEditing("new")}>
              <Plus size={18} strokeWidth={3} /> Add your first wish
            </button>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              ["On the list", pluralise(wishlist.length, "set"), "#FFFAF4"],
              ["If you bought them all", formatINR(total), "#FF9FD0"],
              ["Must-haves only", formatINR(mustHave), "#FFD447"],
            ].map(([k, v, c], i) => (
              <motion.div key={k} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="panel px-4 py-3" style={{ background: c }}>
                <p className="mono-meta text-ink/65">{k}</p>
                <p className="font-display text-3xl font-extrabold">{v}</p>
              </motion.div>
            ))}
          </div>
          <div className="mb-5">
            <Segmented<Priority | 0>
              label="Filter by priority"
              value={only}
              onChange={setOnly}
              options={[
                { value: 0, label: "Everything" },
                { value: 3, label: PRIORITY_META[3].label },
                { value: 2, label: PRIORITY_META[2].label },
                { value: 1, label: PRIORITY_META[1].label },
              ]}
            />
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {sorted.map((w, i) => {
                const t = w.themeId ? get(w.themeId) : null;
                const p = PRIORITY_META[w.priority];
                return (
                  <motion.li
                    key={w.id}
                    layout
                    initial={{ opacity: 0, y: 24, rotate: i % 2 ? 2 : -2 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.85, rotate: 6, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 300, damping: 24, delay: Math.min(i, 8) * 0.04 }}
                    className="panel relative flex flex-col overflow-hidden"
                  >
                    <div className="h-3 border-b-[3px] border-ink" style={{ background: t?.color ?? "#FF9FD0" }} aria-hidden />
                    <span
                      className="absolute right-3 top-6 rotate-6 rounded-md border-[2.5px] border-ink px-2 py-0.5 font-mono text-[0.68rem] font-extrabold uppercase shadow-comic-sm"
                      style={{ background: p.color }}
                    >
                      {p.label}
                    </span>
                    <div className="flex flex-1 flex-col gap-2 p-4 pt-4">
                      {t && <ThemeBadge theme={t} size="sm" className="w-fit max-w-[60%]" />}
                      <h2 className="pr-20 font-display text-xl font-extrabold leading-tight">{w.name}</h2>
                      <p className="mono-meta text-ink/60">{w.setNumber ? `#${w.setNumber}` : "No set number"}</p>
                      <p className="font-display text-2xl font-extrabold">{formatINR(w.targetPrice, { fallback: "No target price" })}</p>
                      {w.notes && <p className="text-sm leading-relaxed text-ink/75">{w.notes}</p>}
                      {w.link && isSafeLink(w.link) && (
                        <a href={w.link} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 text-sm font-bold underline decoration-2 underline-offset-2">
                          Product page <ExternalLink size={13} strokeWidth={3} aria-hidden />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 border-t-[3px] border-ink bg-cream p-3">
                      <button type="button" className="btn btn-sm btn-mint" onClick={() => openAdd({ name: w.name, setNumber: w.setNumber, themeId: w.themeId, purchasePrice: w.targetPrice }, w.id)}>
                        <PartyPopper size={15} strokeWidth={2.8} /> Got it!
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => setEditing(w)} aria-label={`Edit ${w.name}`}>
                        <Pencil size={15} strokeWidth={2.8} />
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost ml-auto" onClick={() => setConfirm(w)} aria-label={`Remove ${w.name} from wishlist`}>
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

      <WishForm item={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={confirm != null}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          deleteWish(confirm.id);
          toast({ kind: "info", title: "Removed from wishlist" });
        }}
        title="Remove from wishlist?"
        body={confirm ? `“${confirm.name}” will be removed. Nothing in your vault changes.` : ""}
        confirmLabel="Remove"
      />
    </div>
  );
}

function WishForm({ item, onClose }: { item: WishItem | "new" | null; onClose: () => void }) {
  return (
    <Modal open={item != null} onClose={onClose} title={item === "new" ? "Add to wishlist" : "Edit wish"} tone="#FF9FD0" eyebrow="Wishlist" size="md">
      {item != null && <WishFormBody key={item === "new" ? "new" : item.id} item={item === "new" ? null : item} onClose={onClose} />}
    </Modal>
  );
}

function WishFormBody({ item, onClose }: { item: WishItem | null; onClose: () => void }) {
  const themes = useVault((s) => s.themes);
  const [name, setName] = useState(item?.name ?? "");
  const [setNumber, setSetNumber] = useState(item?.setNumber ?? "");
  const [theme, setTheme] = useState<ThemePick>(() => {
    const t = item?.themeId ? themes.find((x) => x.id === item.themeId) : undefined;
    return { themeId: t?.id ?? null, name: t?.name ?? "" };
  });
  const [price, setPrice] = useState(paiseToInput(item?.targetPrice ?? null));
  const [priority, setPriority] = useState<Priority>(item?.priority ?? 2);
  const [link, setLink] = useState(item?.link ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [tried, setTried] = useState(false);

  const parsed = parseINR(price);
  const errors = {
    name: !name.trim() ? "Name the set you want" : null,
    price: parsed.ok ? null : parsed.error,
    link: isSafeLink(link.trim()) ? null : "Use a full web address starting with https://",
  };
  const invalid = Object.values(errors).some(Boolean);

  return (
    <form
      noValidate
      className="space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (invalid || !parsed.ok) return;
        const store = useVault.getState();
        const themeId = theme.name.trim() ? (theme.themeId && store.themes.some((t) => t.id === theme.themeId) ? theme.themeId : store.ensureTheme(theme.name)) : null;
        const input = { name: name.trim(), setNumber: setNumber.trim(), themeId, targetPrice: parsed.value, priority, link: link.trim(), notes: notes.trim() };
        if (item) store.updateWish(item.id, input);
        else store.addWish(input);
        toast({ kind: "success", title: item ? "Wish updated" : "Added to your wishlist", body: item ? undefined : "It does not count toward spending until you buy it." });
        onClose();
      }}
    >
      <Field label="Set name" error={tried ? errors.name : null}>
        {({ id, invalid: inv }) => <input id={id} data-autofocus className="input font-display text-lg font-bold" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} aria-invalid={inv || undefined} placeholder="Rivendell" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Set number" optional>
          {({ id }) => <input id={id} className="input font-mono" value={setNumber} onChange={(e) => setSetNumber(e.target.value)} maxLength={24} placeholder="10316" />}
        </Field>
        <Field label="Target price" optional error={errors.price}>
          {({ id, invalid: inv }) => <MoneyInput id={id} value={price} onChange={setPrice} invalid={inv} />}
        </Field>
      </div>
      <Field label="Theme" optional>
        {({ id }) => <ThemeCombobox id={id} value={theme} onChange={setTheme} />}
      </Field>
      <fieldset>
        <legend className="field-label">How badly?</legend>
        <Segmented<Priority>
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={[3, 2, 1].map((p) => ({ value: p as Priority, label: PRIORITY_META[p as Priority].label }))}
        />
      </fieldset>
      <Field label="Link" optional error={tried ? errors.link : null}>
        {({ id, invalid: inv }) => <input id={id} type="url" className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" aria-invalid={inv || undefined} />}
      </Field>
      <Field label="Notes" optional>
        {({ id }) => <textarea id={id} className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Waiting for a sale, birthday idea…" />}
      </Field>
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-red">
          <Gift size={17} strokeWidth={2.8} /> {item ? "Save" : "Add wish"}
        </button>
      </div>
    </form>
  );
}
