"use client";

import {
  ArrowLeft,
  BadgeIndianRupee,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  ScrollText,
  Star,
  Store,
  Tag,
  Trash,
  TrendingUp,
  Wrench,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useId, useMemo, useState } from "react";
import { DropZone, PhotoThumb, storeFiles } from "@/components/sets/PhotoUploader";
import { Delta, FigTag, SetArt, SoldStamp } from "@/components/sets/SetBits";
import { Field, MoneyInput } from "@/components/ui/Fields";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { ConditionStamp, ThemeBadge } from "@/components/ui/ThemeBadge";
import { gainOf, pricePerPieceOf } from "@/lib/calc";
import { ebaySoldUrl } from "@/lib/catalog";
import { useThemes, usePhotoURL } from "@/lib/hooks";
import { compactINR, formatINR, formatNumber, paiseToInput, parseINR } from "@/lib/money";
import { useVault } from "@/lib/store";
import type { LegoSet, SetEvent, Theme } from "@/lib/types";
import { toast, useUI } from "@/lib/ui";
import { cn, formatDate, relativeDays, todayISO } from "@/lib/utils";

const TABS = ["Overview", "History", "Photos", "Value"] as const;
type Tab = (typeof TABS)[number];

// Set ids live in the browser, so the page reads them from ?id= instead of the path (works on static hosting).
export default function SetPage() {
  return (
    <Suspense>
      <SetView />
    </Suspense>
  );
}

function SetView() {
  const id = useSearchParams().get("id") ?? "";
  const set = useVault((s) => s.sets.find((x) => x.id === id));
  const { get } = useThemes();

  if (!set) {
    return (
      <div className="panel mt-6">
        <EmptyState art="search" title="Set not found" body="It may have been deleted, or the link is from another browser.">
          <Link href="/collection" className="btn btn-yellow">
            Back to the vault
          </Link>
        </EmptyState>
      </div>
    );
  }
  return <Dossier set={set} theme={get(set.themeId)} />;
}

function Dossier({ set, theme }: { set: LegoSet; theme: Theme }) {
  const router = useRouter();
  const openEdit = useUI((s) => s.openEdit);
  const { deleteSet, restoreDeleted, unmarkSold } = useVault.getState();
  const [tab, setTab] = useState<Tab>("Overview");
  const [photo, setPhoto] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selling, setSelling] = useState(false);
  const [valuing, setValuing] = useState(false);
  const gain = gainOf(set);
  const ppp = pricePerPieceOf(set);

  const remove = () => {
    const index = useVault.getState().sets.findIndex((s) => s.id === set.id);
    const removed = deleteSet(set.id);
    router.push("/collection");
    if (removed) {
      useUI.getState().setPulse([removed.themeId], -(removed.purchasePrice ?? 0));
      toast({
        kind: "info",
        title: `Deleted ${removed.name}`,
        body: removed.purchasePrice ? `${formatINR(removed.purchasePrice)} came off your total.` : "Totals updated.",
        action: { label: "Undo", run: () => restoreDeleted(removed, index) },
      });
    }
  };

  return (
    <article>
      <Link href="/collection" className="btn btn-ghost btn-sm mb-4 -ml-2">
        <ArrowLeft size={16} strokeWidth={3} /> Vault
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_1fr]">
        <Gallery set={set} theme={theme} index={photo} setIndex={setPhoto} onAdd={() => setTab("Photos")} />

        <div className="min-w-0">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className="flex flex-wrap items-center gap-2">
            <Link href={`/collection?theme=${theme.id}`} aria-label={`More ${theme.name} sets`}>
              <ThemeBadge theme={theme} className="shadow-comic-sm transition-transform hover:-rotate-2" />
            </Link>
            <ConditionStamp condition={set.condition} size="lg" className="rotate-2" />
            {set.status === "sold" && <SoldStamp className="text-base" />}
            {set.kind === "minifig" && <FigTag className="text-[0.8rem]" />}
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="mt-4 font-mono text-lg font-bold tracking-wider text-ink/70">
            {set.setNumber ? `#${set.setNumber}` : set.kind === "minifig" ? "No figure number" : "No set number"}
            {set.pieces != null && <span> · {formatNumber(set.pieces)} pieces</span>}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="misprint mt-1 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-5xl"
          >
            {set.name}
          </motion.h1>

          <dl className="mt-6 grid grid-cols-2 gap-3">
            <Money label="Paid" icon={<Tag size={13} strokeWidth={3} aria-hidden />} delay={0.15} tone="#FFD447">
              {formatINR(set.purchasePrice, { fallback: "Not recorded" })}
            </Money>
            {set.status === "sold" ? (
              <Money label={`Sold ${formatDate(set.saleDate)}`} icon={<CircleDollarSign size={13} strokeWidth={3} aria-hidden />} delay={0.2} tone="#FF9FD0">
                {formatINR(set.salePrice, { fallback: "Not recorded" })}
              </Money>
            ) : (
              <Money label="Est. value" icon={<TrendingUp size={13} strokeWidth={3} aria-hidden />} delay={0.2} tone="#7BF1C8" sub={set.marketValueAt ? `Updated ${relativeDays(set.marketValueAt)}` : "Your estimate"}>
                {formatINR(set.marketValue, { fallback: "No estimate" })}
              </Money>
            )}
            <Money label={set.status === "sold" ? "Realised" : "Gain / loss"} delay={0.25}>
              {set.status === "sold" ? (
                set.salePrice != null && set.purchasePrice != null ? (
                  <span className={set.salePrice - set.purchasePrice >= 0 ? "gain" : "loss"}>{formatINR(set.salePrice - set.purchasePrice, { signed: true })}</span>
                ) : (
                  "—"
                )
              ) : gain ? (
                <Delta delta={gain.delta} pct={gain.pct} showLabel />
              ) : (
                <span className="text-base text-ink/60">Needs price + estimate</span>
              )}
            </Money>
            <Money label="Per piece" delay={0.3}>
              {ppp != null ? formatINR(ppp) : "—"}
            </Money>
          </dl>

          <AnimatePresence>{valuing && <ValueEditor set={set} onDone={() => setValuing(false)} />}</AnimatePresence>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-yellow" onClick={() => openEdit(set.id)}>
              <Pencil size={17} strokeWidth={2.8} /> Edit
            </button>
            {set.status === "owned" && (
              <button type="button" className="btn btn-mint" onClick={() => setValuing((v) => !v)} aria-expanded={valuing}>
                <TrendingUp size={17} strokeWidth={2.8} /> Update value
              </button>
            )}
            <a href={ebaySoldUrl(set)} target="_blank" rel="noopener noreferrer" className="btn" title={`Opens eBay's sold ${set.condition === "sealed" ? "new" : "used"} listings in a new tab`}>
              <ExternalLink size={17} strokeWidth={2.8} /> Check eBay sold prices
            </a>
            {set.status === "owned" ? (
              <button type="button" className="btn" onClick={() => setSelling(true)}>
                <BadgeIndianRupee size={17} strokeWidth={2.8} /> Mark sold
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  unmarkSold(set.id);
                  toast({ kind: "success", title: "Back in the vault", body: "Its price counts toward your totals again." });
                }}
              >
                <RotateCcw size={17} strokeWidth={2.8} /> Undo sale
              </button>
            )}
            <button type="button" className="btn btn-ghost text-red-deep" onClick={() => setConfirmDelete(true)}>
              <Trash size={17} strokeWidth={2.8} /> Delete
            </button>
          </motion.div>
        </div>
      </div>

      <section className="mt-12">
        <Tabs tab={tab} setTab={setTab} counts={{ History: set.history.length, Photos: set.photoIds.length }} />
        <div className="panel mt-0 rounded-tl-none p-4 sm:p-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              id={`panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.1 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              {tab === "Overview" && <Overview set={set} theme={theme} />}
              {tab === "History" && <HistoryList events={set.history} />}
              {tab === "Photos" && <PhotoManager set={set} onPick={(i) => setPhoto(i)} />}
              {tab === "Value" && <ValueHistory set={set} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title={`Delete ${set.name}?`}
        body={
          <>
            This removes the set, its history and photos from your vault
            {set.purchasePrice ? <> and takes <strong>{formatINR(set.purchasePrice)}</strong> off your total spent</> : null}. If you sold it, use <strong>Mark sold</strong> instead to keep its record.
          </>
        }
      />
      <SellDialog set={set} open={selling} onClose={() => setSelling(false)} />
    </article>
  );
}

function Money({ label, children, icon, sub, delay = 0, tone = "#FFFAF4" }: { label: string; children: ReactNode; icon?: ReactNode; sub?: string; delay?: number; tone?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22, delay }}
      className="relative overflow-hidden rounded-xl border-[3px] border-ink px-3.5 py-3 shadow-comic-sm"
      style={{ background: tone }}
    >
      <dt className="mono-meta flex items-center gap-1.5 text-ink/65">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-tight tabular-nums">{children}</dd>
      {sub && <p className="mt-0.5 text-[0.72rem] font-medium text-ink/60">{sub}</p>}
    </motion.div>
  );
}

function Gallery({ set, theme, index, setIndex, onAdd }: { set: LegoSet; theme: Theme; index: number; setIndex: (i: number) => void; onAdd: () => void }) {
  const ids = set.photoIds;
  const safe = Math.min(index, Math.max(0, ids.length - 1));
  const url = usePhotoURL(ids[safe]);
  const go = (d: number) => setIndex((safe + d + ids.length) % ids.length);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.94, rotate: -1.5 }} animate={{ opacity: 1, scale: 1, rotate: -0.6 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
      <div className="panel relative aspect-[4/3] overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          {ids.length && url ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob URL
            <motion.img
              key={ids[safe]}
              src={url}
              alt={`${set.name}, photo ${safe + 1} of ${ids.length}`}
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          ) : (
            <motion.div key="art" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SetArt set={set} theme={theme} size="hero" />
            </motion.div>
          )}
        </AnimatePresence>
        {ids.length > 1 && (
          <>
            <button type="button" className="btn btn-icon btn-sm absolute left-3 top-1/2 -translate-y-1/2" onClick={() => go(-1)} aria-label="Previous photo">
              <ChevronLeft size={20} strokeWidth={3} />
            </button>
            <button type="button" className="btn btn-icon btn-sm absolute right-3 top-1/2 -translate-y-1/2" onClick={() => go(1)} aria-label="Next photo">
              <ChevronRight size={20} strokeWidth={3} />
            </button>
            <span className="mono-meta absolute bottom-3 right-3 rounded-md border-2 border-ink bg-paper px-1.5 py-0.5">
              {safe + 1} / {ids.length}
            </span>
          </>
        )}
        {ids.length === 0 && (
          <button type="button" className="btn btn-sm absolute bottom-3 right-3" onClick={onAdd}>
            <Camera size={16} strokeWidth={2.8} /> Add photos
          </button>
        )}
      </div>
      {ids.length > 1 && (
        <ul className="no-scrollbar mt-4 flex gap-2.5 overflow-x-auto p-1">
          {ids.map((id, i) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === safe}
                className={cn("block h-16 w-16 overflow-hidden rounded-lg border-[2.5px] border-ink transition-transform", i === safe ? "-rotate-3 shadow-comic-sm" : "opacity-70 hover:opacity-100")}
              >
                <PhotoThumb id={id} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function Tabs({ tab, setTab, counts }: { tab: Tab; setTab: (t: Tab) => void; counts: Partial<Record<Tab, number>> }) {
  return (
    <div
      role="tablist"
      aria-label="Set details"
      className="no-scrollbar -mb-[3px] flex gap-1 overflow-x-auto"
      onKeyDown={(e) => {
        const i = TABS.indexOf(tab);
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const next = TABS[(i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length];
          setTab(next);
          document.getElementById(`tab-${next}`)?.focus();
        }
      }}
    >
      {TABS.map((t) => {
        const on = t === tab;
        return (
          <button
            key={t}
            id={`tab-${t}`}
            role="tab"
            type="button"
            aria-selected={on}
            aria-controls={`panel-${t}`}
            tabIndex={on ? 0 : -1}
            onClick={() => setTab(t)}
            className={cn(
              "relative shrink-0 rounded-t-xl border-[3px] px-4 py-2.5 font-display text-sm font-extrabold uppercase tracking-wide transition-colors sm:px-5",
              on ? "z-10 border-ink border-b-paper bg-paper" : "border-transparent hover:bg-ink/5",
            )}
          >
            {on && <motion.span layoutId="tab-dot" className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-ink bg-red" />}
            {t}
            {counts[t] ? <span className="ml-1.5 rounded-full bg-ink px-1.5 py-0.5 text-[0.65rem] text-paper">{counts[t]}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function Overview({ set, theme }: { set: LegoSet; theme: Theme }) {
  const rows: Array<[string, ReactNode]> = [
    ["Theme", theme.name],
    [set.kind === "minifig" ? "Figure number" : "Set number", set.setNumber || "—"],
    ["Pieces", formatNumber(set.pieces)],
    ["Purchase date", formatDate(set.purchaseDate, "Not recorded")],
    ["Seller", set.seller || "—"],
    ["Price paid", formatINR(set.purchasePrice, { fallback: "Not recorded" })],
    ...(set.mrp != null ? ([["MRP", formatINR(set.mrp)]] as Array<[string, ReactNode]>) : []),
    ["Estimated value", set.marketValue != null ? `${formatINR(set.marketValue)}${set.marketValueAt ? ` (as of ${formatDate(set.marketValueAt)})` : ""}` : "No estimate"],
    ["Status", set.status === "sold" ? `Sold${set.saleDate ? ` on ${formatDate(set.saleDate)}` : ""}` : "In the vault"],
    ["Added", formatDate(set.createdAt)],
    ["Last updated", formatDate(set.updatedAt)],
  ];
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
      <dl className="grid gap-x-6 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b-2 border-dashed border-ink/20 py-2.5">
            <dt className="mono-meta text-ink/60">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h2 className="mono-meta mb-2 flex items-center gap-1.5">
          <ScrollText size={14} strokeWidth={3} aria-hidden /> Notes
        </h2>
        <div className="relative rounded-2xl border-[3px] border-ink bg-cream p-4 shadow-comic-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{set.notes || <span className="text-ink/55">No notes yet. Use Edit to add box condition, missing parts or build memories.</span>}</p>
          <svg className="absolute -bottom-[17px] left-8 h-4 w-6" viewBox="0 0 24 16" aria-hidden>
            <path d="M2 0 L6 14 L20 0" fill="#FFF3E8" stroke="#2A1F45" strokeWidth="3" strokeLinejoin="round" />
            <path d="M0 0 H24" stroke="#FFF3E8" strokeWidth="4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

const EVENT_STYLE: Record<SetEvent["type"], { Icon: typeof Plus; bg: string }> = {
  added: { Icon: Plus, bg: "#FFD447" },
  purchased: { Icon: Store, bg: "#62D2FF" },
  value: { Icon: TrendingUp, bg: "#7BF1C8" },
  price: { Icon: Tag, bg: "#FFD447" },
  condition: { Icon: Wrench, bg: "#FFB4A2" },
  edited: { Icon: Pencil, bg: "#FFFAF4" },
  photo: { Icon: Camera, bg: "#FF9FD0" },
  sold: { Icon: CircleDollarSign, bg: "#FF5C6C" },
  restored: { Icon: RotateCcw, bg: "#7BF1C8" },
};

function HistoryList({ events }: { events: SetEvent[] }) {
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  if (!sorted.length) return <p className="text-ink/70">No history yet.</p>;
  return (
    <ol className="relative ml-4 border-l-[3px] border-ink pl-7">
      {sorted.map((e, i) => {
        const { Icon, bg } = EVENT_STYLE[e.type];
        const money = (e.type === "value" || e.type === "price") && (typeof e.from === "number" || typeof e.to === "number");
        return (
          <motion.li key={e.id} className="relative pb-5 last:pb-0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.04 }}>
            <span className="absolute -left-[45px] top-0 grid h-8 w-8 place-items-center rounded-full border-[3px] border-ink" style={{ background: bg }} aria-hidden>
              <Icon size={15} strokeWidth={2.8} />
            </span>
            <p className="font-semibold leading-snug">{e.label}</p>
            {money && (
              <p className="mt-0.5 font-mono text-sm">
                {typeof e.from === "number" ? formatINR(e.from) : "—"} → <strong>{typeof e.to === "number" ? formatINR(e.to) : "removed"}</strong>
              </p>
            )}
            <p className="mono-meta mt-0.5 text-ink/55">{formatDate(e.at)}</p>
          </motion.li>
        );
      })}
    </ol>
  );
}

function PhotoManager({ set, onPick }: { set: LegoSet; onPick: (i: number) => void }) {
  const { addPhotos, removePhoto, makeCover } = useVault.getState();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const add = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    const res = await storeFiles(files);
    setBusy(false);
    setErrors(res.errors);
    if (res.ids.length) {
      addPhotos(set.id, res.ids);
      toast({ kind: "success", title: `Added ${res.ids.length} photo${res.ids.length > 1 ? "s" : ""}` });
    }
  };
  return (
    <div className="space-y-5">
      <DropZone onFiles={add} busy={busy} compact />
      {errors.length > 0 && (
        <ul className="rounded-lg border-2 border-ink bg-pink px-3 py-2 text-sm font-semibold" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {set.photoIds.length === 0 ? (
        <EmptyState compact art="photos" title="No photos yet" body="Box art, the finished build, shelf shots. They stay in this browser." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {set.photoIds.map((id, i) => (
            <motion.li key={id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1, rotate: i % 2 ? 1 : -1 }} className="group relative aspect-square overflow-hidden rounded-xl border-[3px] border-ink shadow-comic-sm">
              <button type="button" className="block h-full w-full" onClick={() => onPick(i)} aria-label={`Show photo ${i + 1} at the top`}>
                <PhotoThumb id={id} alt={`${set.name} photo ${i + 1}`} />
              </button>
              {i === 0 ? (
                <span className="mono-meta absolute bottom-2 left-2 rounded border-2 border-ink bg-yellow px-1 text-[0.6rem]">Cover</span>
              ) : (
                <button type="button" onClick={() => makeCover(set.id, id)} className="btn btn-sm absolute bottom-2 left-2 px-2" aria-label={`Make photo ${i + 1} the cover`}>
                  <Star size={14} strokeWidth={2.8} />
                </button>
              )}
              <button type="button" onClick={() => setConfirm(id)} className="btn btn-sm btn-icon absolute right-2 top-2" aria-label={`Delete photo ${i + 1}`}>
                <X size={15} strokeWidth={3} />
              </button>
            </motion.li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirm != null}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && removePhoto(set.id, confirm)}
        title="Delete this photo?"
        body="The photo is removed from this browser for good."
      />
    </div>
  );
}

function ValueHistory({ set }: { set: LegoSet }) {
  const points = useMemo(
    () =>
      set.history
        .filter((e) => e.type === "value" && typeof e.to === "number")
        .map((e) => ({ at: e.at, v: e.to as number }))
        .sort((a, b) => a.at.localeCompare(b.at)),
    [set.history],
  );
  const id = useId();
  if (points.length === 0) {
    return <EmptyState compact art="chart" title="No estimates yet" body="Use “Update value” whenever you check prices. Each update is kept here so you can see the trend." />;
  }
  const values = points.map((p) => p.v);
  if (set.purchasePrice != null) values.push(set.purchasePrice);
  const max = Math.max(...values) * 1.1;
  const min = Math.min(...values) * 0.85;
  const W = 600;
  const H = 200;
  const x = (i: number) => (points.length === 1 ? W / 2 : 30 + (i / (points.length - 1)) * (W - 60));
  const y = (v: number) => H - 20 - ((v - min) / (max - min || 1)) * (H - 40);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.v)}`).join(" ");
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
      <figure>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-labelledby={`${id}-cap`}>
          {set.purchasePrice != null && (
            <g>
              <line x1="0" x2={W} y1={y(set.purchasePrice)} y2={y(set.purchasePrice)} stroke="#2A1F45" strokeWidth="2" strokeDasharray="8 6" />
              <text x={W} y={y(set.purchasePrice) - 6} textAnchor="end" fontSize="12" fontFamily="var(--font-jetbrains)" fontWeight="700">
                PAID {compactINR(set.purchasePrice)}
              </text>
            </g>
          )}
          <motion.path d={path} fill="none" stroke="#2A1F45" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" transform="translate(3 3)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 }} />
          <motion.path d={path} fill="none" stroke="#4062FF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9 }} />
          {points.map((p, i) => (
            <motion.circle key={p.at + i} cx={x(i)} cy={y(p.v)} r="8" fill="#FFD447" stroke="#2A1F45" strokeWidth="3" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.08, type: "spring" }} />
          ))}
        </svg>
        <figcaption id={`${id}-cap`} className="mt-2 text-sm text-ink/65">
          Your value estimates over time{set.purchasePrice != null ? ", with the price you paid as a dashed line" : ""}.
        </figcaption>
      </figure>
      <ol className="space-y-2">
        {[...points].reverse().map((p, i) => (
          <li key={p.at + i} className="flex items-center justify-between rounded-lg border-2 border-ink bg-cream px-3 py-2">
            <span className="mono-meta">{formatDate(p.at)}</span>
            <span className="font-display font-extrabold">{formatINR(p.v)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ValueEditor({ set, onDone }: { set: LegoSet; onDone: () => void }) {
  const [text, setText] = useState(paiseToInput(set.marketValue));
  const parsed = parseINR(text);
  const updateValue = useVault((s) => s.updateValue);
  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
      onSubmit={(e) => {
        e.preventDefault();
        if (!parsed.ok) return;
        const before = set.marketValue;
        updateValue(set.id, parsed.value);
        toast({
          kind: "success",
          title: parsed.value == null ? "Estimate removed" : `Now worth about ${formatINR(parsed.value)}`,
          body: before != null && parsed.value != null ? `Was ${formatINR(before)}. Logged in the set's history.` : "Logged in the set's history.",
        });
        onDone();
      }}
    >
      <div className="mt-4 rounded-xl border-[3px] border-dashed border-ink bg-mint/40 p-3">
        <Field label="New estimated value" error={parsed.ok ? null : parsed.error} hint="What you think it would sell for today. Leave empty to clear.">
          {({ id, describedBy, invalid }) => (
            <div className="flex gap-2">
              <div className="flex-1">
                <MoneyInput id={id} data-autofocus autoFocus value={text} onChange={setText} describedBy={describedBy} invalid={invalid} />
              </div>
              <button type="submit" className="btn btn-sm self-start" disabled={!parsed.ok}>
                Save
              </button>
            </div>
          )}
        </Field>
      </div>
    </motion.form>
  );
}

function SellDialog({ set, open, onClose }: { set: LegoSet; open: boolean; onClose: () => void }) {
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayISO());
  const parsed = parseINR(price);
  const markSold = useVault((s) => s.markSold);
  const bad = !parsed.ok || (date && date > todayISO());
  return (
    <Modal open={open} onClose={onClose} title="Mark as sold" eyebrow={set.name} size="sm" tone="#FF9FD0">
      <form
        className="space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (bad || !parsed.ok) return;
          markSold(set.id, { price: parsed.value, date: date || null });
          useUI.getState().setPulse([set.themeId], -(set.purchasePrice ?? 0));
          toast({ kind: "success", title: "Marked as sold", body: "Its history is kept. It moves out of your in-vault totals." });
          onClose();
        }}
      >
        <Field label="Sale price" optional error={parsed.ok ? null : parsed.error}>
          {({ id, invalid }) => <MoneyInput id={id} data-autofocus value={price} onChange={setPrice} invalid={invalid} />}
        </Field>
        <Field label="Sale date" error={date > todayISO() ? "Sale date cannot be in the future" : null}>
          {({ id, invalid }) => <input id={id} type="date" className="input font-mono" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} aria-invalid={invalid || undefined} />}
        </Field>
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-red" disabled={!!bad}>
            Mark sold
          </button>
        </div>
      </form>
    </Modal>
  );
}
