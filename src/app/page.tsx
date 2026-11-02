"use client";

import { ArrowRight, Blocks, Crown, Gauge, Gift, Plus, Puzzle, Sparkles, Trophy, Upload } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Fragment, type ReactNode, useMemo, useState } from "react";
import { GainMeter, StatTile } from "@/components/charts/Boards";
import { Delta } from "@/components/sets/SetBits";
import { SetCard } from "@/components/sets/SetCard";
import { CountUp } from "@/components/ui/CountUp";
import { DoodleArrow, Marquee, Sparkle, Squiggle, Starburst, Studs } from "@/components/ui/Decor";
import { Minibuild } from "@/components/lego/Minibuild";
import { Minifig } from "@/components/lego/Minifig";
import { BrickBurst, BrickDivider, ComicStory, ScrollTitle, type StoryPanel, ThemeTower, type TowerLayer } from "@/components/lego/ScrollScenes";
import { Panel, StudRow } from "@/components/ui/Panel";
import { popIn } from "@/lib/motion";

import { themeSurface } from "@/components/ui/ThemeBadge";
import { ThemeIcon } from "@/components/ui/ThemeIcon";
import { computeStats, inScope } from "@/lib/calc";
import { buildDemo } from "@/lib/demo";
import { useThemes } from "@/lib/hooks";
import { compactINR, formatINR, formatNumber, formatPct } from "@/lib/money";
import { useVault } from "@/lib/store";
import { toast, useUI } from "@/lib/ui";
import { formatDate, pluralise } from "@/lib/utils";

export default function HQPage() {
  const sets = useVault((s) => s.sets);
  if (sets.length === 0) return <FirstRun />;
  return <HQ />;
}

function HQ() {
  const sets = useVault((s) => s.sets);
  const wishlist = useVault((s) => s.wishlist);
  const fields = useVault((s) => s.prefs.cardFields);
  const openAdd = useUI((s) => s.openAdd);
  const pulse = useUI((s) => s.pulse);
  const { get } = useThemes();
  const owned = useMemo(() => inScope(sets, "owned"), [sets]);
  const stats = useMemo(() => computeStats(owned), [owned]);
  const lifetime = useMemo(() => computeStats(sets).totalSpent, [sets]);
  const recent = useMemo(() => [...owned].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4), [owned]);
  const wishTotal = wishlist.reduce((s, w) => s + (w.targetPrice ?? 0), 0);
  const [burst, setBurst] = useState(0);
  const topTheme = stats.topTheme ? get(stats.topTheme.themeId) : null;

  const tower = useMemo<TowerLayer[]>(() => {
    const max = Math.max(1, ...stats.byTheme.map((s) => s.spent));
    // Biggest spend first, so it becomes the base of the stack.
    return stats.byTheme.slice(0, 8).map((s) => {
      const t = get(s.themeId);
      return {
        key: s.themeId,
        name: t.name,
        color: t.color,
        weight: s.spent / max,
        amount: formatINR(s.spent),
        detail: `${pluralise(s.count, "set")} · ${formatPct(s.share * 100)} of your spend`,
      };
    });
  }, [stats.byTheme, get]);

  const story = useMemo<StoryPanel[]>(() => {
    const first = owned.filter((s) => s.purchaseDate).sort((a, b) => a.purchaseDate!.localeCompare(b.purchaseDate!))[0];
    const out: Array<StoryPanel | null> = [
      first
        ? {
            caption: "Chapter 1 · Where it began",
            title: `It started with ${first.name}`,
            body: `Bought ${formatDate(first.purchaseDate)}${first.purchasePrice != null ? ` for ${formatINR(first.purchasePrice)}` : ""}. The first brick in the vault.`,
            sfx: "RIIIP!",
            tone: "#FF9FD0",
            href: `/set?id=${first.id}`,
            fig: { mood: "wow", print: "brick", torso: "#FF5C6C", legs: "#2A1F45", hat: "hair", hatColor: "#8A5A2B" },
          }
        : null,
      stats.topByPrice
        ? {
            caption: "Chapter 2 · The big one",
            title: stats.topByPrice.name,
            body: `${formatINR(stats.topByPrice.purchasePrice)}, the most you have paid for a single set.`,
            sfx: "KA-CHING!",
            tone: "#FFD447",
            href: `/set?id=${stats.topByPrice.id}`,
            fig: { mood: "grin", print: "rupee", torso: "#2FCB8A", legs: "#4062FF", hat: "crown", wave: true },
          }
        : null,
      topTheme && stats.topTheme
        ? {
            caption: "Chapter 3 · A theme takes over",
            title: `${topTheme.name} rules`,
            body: `${formatPct(stats.topTheme.share * 100)} of everything you spent went here, across ${pluralise(stats.topTheme.count, "set")}.`,
            sfx: "WHOOSH!",
            tone: "#7BF1C8",
            href: `/collection?theme=${topTheme.id}`,
            fig: { mood: "determined", print: "star", torso: "#A77BFF", legs: "#2A1F45", hat: "helmet", hatColor: "#FFFAF4" },
          }
        : null,
      {
        caption: "Chapter 4 · Today",
        title: `${pluralise(stats.count, "set")}, ${pluralise(stats.totalPieces, "piece")}`,
        body:
          stats.valuedCount > 0
            ? `Your own estimates put the vault at ${formatINR(stats.estValue)}${stats.unrealised != null ? `, ${formatINR(stats.unrealised, { signed: true })} against what you paid for those sets` : ""}.`
            : "Add estimated values to your sets to see what the vault might be worth.",
        sfx: "BOOM!",
        tone: "#62D2FF",
        href: "/value",
        fig: { mood: "smirk", print: "rupee", torso: "#FFD447", legs: "#FF5C6C", hat: "cap", hatColor: "#2A1F45", wave: true },
      },
    ];
    return out.filter((p): p is StoryPanel => p != null);
  }, [owned, stats, topTheme]);

  return (
    <div className="space-y-10">
      {/* ── Hero: the giant spend counter ── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12" aria-labelledby="hq-title">
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: -1.5 }}
          animate={{ opacity: 1, y: 0, rotate: -0.6 }}
          transition={popIn(0.35, 0.8)}
          className="panel relative overflow-hidden bg-red px-5 pb-6 pt-5 sm:px-8 sm:pb-8 lg:col-span-7"
        >
          <div className="speedlines pointer-events-none absolute -inset-[40%] animate-spin-slow opacity-70" aria-hidden />
          <div className="halftone-fade pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative">
            <p className="label-tab bg-paper">
              <Blocks size={14} strokeWidth={3} aria-hidden /> Command centre
            </p>
            <h1 id="hq-title" className="mt-5 font-display text-lg font-extrabold uppercase tracking-wide sm:text-xl">
              Total spent on LEGO
            </h1>
            <div className="relative mt-1 inline-block">
              <CountUp
                value={stats.totalSpent}
                money
                memoryKey="hq-spent"
                className="stroke-text block font-display text-[2.3rem] leading-[1] sm:text-6xl xl:text-[4.4rem]"
                onRise={() => setBurst((b) => b + 1)}
              />
              {burst > 0 && (
                <motion.span
                  key={burst}
                  className="pointer-events-none absolute -right-10 -top-10 sm:-right-16"
                  initial={{ scale: 0, rotate: -40 }}
                  animate={{ scale: [0, 1.25, 1, 1, 0], rotate: [-40, 0, 0, 0, 10] }}
                  transition={{ duration: 2.6, times: [0, 0.15, 0.25, 0.85, 1] }}
                  aria-hidden
                >
                  <Starburst className="h-24 w-24 sm:h-28 sm:w-28" fill="#FFD447">
                    <span className="sfx block -rotate-12 text-lg text-paper sm:text-xl">KA-CHING!</span>
                  </Starburst>
                </motion.span>
              )}
            </div>
            <p className="mt-3 max-w-lg text-[1.02rem] font-semibold leading-snug">
              Across {pluralise(stats.count, "set")} and {pluralise(stats.totalPieces, "piece")} in your vault.
              {lifetime !== stats.totalSpent && <span className="block text-sm font-medium opacity-80">Lifetime, including sold sets: {formatINR(lifetime)}</span>}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="btn btn-yellow" onClick={() => openAdd()}>
                <Plus size={18} strokeWidth={3} /> Add a set
              </button>
              <Link href="/value" className="btn bg-paper">
                <Gauge size={18} strokeWidth={2.8} /> Value tracker
              </Link>
            </div>
          </div>
          <div className="absolute -bottom-2 right-3 hidden h-40 w-[6.5rem] sm:block md:right-6">
            <Minifig wave jumpKey={burst} print="rupee" torso="#FFD447" legs="#4062FF" hat="cap" hatColor="#2A1F45" className="h-full w-full" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0.5 }}
          transition={popIn(0.5, 0.8)}
          className="panel relative overflow-hidden bg-paper px-5 pb-5 pt-5 lg:col-span-5"
        >
          <p className="label-tab bg-mint">Estimated value</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <CountUp value={stats.estValue} money memoryKey="hq-value" className="block font-display text-4xl font-extrabold tracking-tight sm:text-5xl" />
              <p className="mt-1 text-sm text-ink/70">
                Your estimates for {stats.valuedCount} of {pluralise(stats.count, "set")}.
              </p>
            </div>
            {stats.unrealised != null && <Delta delta={stats.unrealised} pct={stats.returnPct} showLabel />}
          </div>
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_auto]">
            <GainMeter pct={stats.returnPct} />
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-1">
              <div className="rounded-lg border-2 border-ink bg-cream px-3 py-2">
                <dt className="mono-meta text-[0.62rem] text-ink/60">Unrealised</dt>
                <dd className={`font-display text-lg font-extrabold ${stats.unrealised == null ? "" : stats.unrealised >= 0 ? "gain" : "loss"}`}>
                  {formatINR(stats.unrealised, { signed: true, fallback: "No estimates" })}
                </dd>
              </div>
              <div className="rounded-lg border-2 border-ink bg-cream px-3 py-2">
                <dt className="mono-meta text-[0.62rem] text-ink/60">Return</dt>
                <dd className="font-display text-lg font-extrabold">{formatPct(stats.returnPct, { signed: true })}</dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 text-[0.75rem] leading-snug text-ink/60">
            Gain and return compare price paid with your estimate, only for sets that have both. Estimates are yours, not verified market prices.
          </p>
        </motion.div>
      </section>

      {/* ── Ticker ── */}
      <div className="-mx-4 -rotate-1 border-y-[3px] border-ink bg-ink py-2.5 text-yellow sm:-mx-6 lg:-mx-8" aria-hidden>
        <Marquee>
          {[
            `${formatINR(stats.totalSpent)} spent`,
            `${formatNumber(stats.count)} sets`,
            `${formatNumber(stats.totalPieces)} pieces`,
            stats.pricePerPiece != null ? `${formatINR(stats.pricePerPiece)} per piece` : null,
            topTheme ? `Top theme: ${topTheme.name}` : null,
            `${formatINR(stats.estValue)} est. value`,
          ]
            .filter(Boolean)
            .map((t) => (
              <span key={t} className="flex items-center gap-10 font-display text-lg font-extrabold uppercase tracking-wide">
                {t} <Sparkle className="h-5 w-5" />
              </span>
            ))}
        </Marquee>
      </div>

      {/* ── Stat tiles ── */}
      <section aria-label="Collection numbers" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Sets owned" tone="#FFD447" icon={<Blocks size={13} strokeWidth={3} aria-hidden />}>
          <CountUp value={stats.count} memoryKey="hq-count" />
        </StatTile>
        <StatTile label="Total pieces" tone="#62D2FF" delay={0.05} icon={<Puzzle size={13} strokeWidth={3} aria-hidden />}>
          <CountUp value={stats.totalPieces} memoryKey="hq-pieces" />
        </StatTile>
        <StatTile label="Average per set" tone="#FF9FD0" delay={0.1} sub={`From ${pluralise(stats.pricedCount, "priced set")}`}>
          {formatINR(stats.avgPrice)}
        </StatTile>
        <StatTile label="Price per piece" tone="#7BF1C8" delay={0.15} sub="Total paid ÷ pieces, where both are known">
          {stats.pricePerPiece != null ? formatINR(stats.pricePerPiece) : "—"}
        </StatTile>
      </section>

      {/* ── Records ── */}
      <section aria-label="Records" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RecordCard
          kicker="Most expensive set"
          icon={<Trophy size={14} strokeWidth={3} aria-hidden />}
          title={stats.topByPrice?.name ?? "Add prices to crown one"}
          amount={stats.topByPrice?.purchasePrice ?? null}
          href={stats.topByPrice ? `/set?id=${stats.topByPrice.id}` : undefined}
          tone="#FFD447"
        />
        <RecordCard
          kicker="Biggest theme by spend"
          icon={<Crown size={14} strokeWidth={3} aria-hidden />}
          title={topTheme?.name ?? "No spending yet"}
          amount={stats.topTheme?.spent ?? null}
          href={topTheme ? `/collection?theme=${topTheme.id}` : undefined}
          tone="#A77BFF"
          extra={stats.topTheme ? `${formatPct(stats.topTheme.share * 100)} of your spend` : undefined}
        />
      </section>

      <BrickDivider />

      {/* ── Your universe: theme worlds ── */}
      <section aria-labelledby="universe-title" className="relative">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="relative">
            <ScrollTitle id="universe-title" text="Your universe" className="text-4xl sm:text-5xl" />
            <Squiggle className="mt-1 h-4 w-40" color="#FF5C6C" />
          </div>
          <Link href="/themes" className="btn btn-sm">
            Manage themes <ArrowRight size={16} strokeWidth={3} />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {stats.byTheme.map((slice, i) => {
            const t = get(slice.themeId);
            const flashing = pulse && Date.now() - pulse.at < 15_000 && pulse.themeIds.includes(t.id);
            return (
              <motion.li
                key={slice.themeId}
                initial={{ opacity: 0, y: 30, rotate: i % 2 ? 3 : -3 }}
                whileInView={{ opacity: 1, y: 0, rotate: i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -6, rotate: 0, scale: 1.02 }}
                transition={popIn(0.3 + Math.min(i, 8) * 0.1, 0.6)}
                className="relative mt-3"
              >
                <StudRow className="left-5 z-10" count={3} color={t.color} />
                <Link href={`/collection?theme=${t.id}`} className="panel group relative block h-full overflow-hidden" style={themeSurface(t)}>
                  <ThemeIcon icon={t.icon} className="absolute -bottom-5 -right-5 h-28 w-28 opacity-25 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" strokeWidth={2} />
                  <div className="relative flex h-full flex-col gap-3 p-4">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border-[3px] border-ink bg-paper text-ink shadow-comic-sm transition-transform group-hover:rotate-[-8deg]">
                      <ThemeIcon icon={t.icon} size={22} />
                    </span>
                    <div className="mt-auto">
                      <h3 className="font-display text-xl font-extrabold uppercase leading-none tracking-tight">{t.name}</h3>
                      <p className="mt-1.5 font-display text-lg font-extrabold">{formatINR(slice.spent)}</p>
                      <p className="mono-meta text-[0.62rem] opacity-80">
                        {pluralise(slice.count, "set")} · {formatPct(slice.share * 100)}
                      </p>
                    </div>
                  </div>
                  {flashing && (
                    <motion.span
                      className="sfx absolute right-2 top-2 text-lg"
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: [0, 1.3, 1], rotate: 8 }}
                      transition={{ duration: 0.5 }}
                    >
                      NEW!
                    </motion.span>
                  )}
                </Link>
              </motion.li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => openAdd()}
              className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-[16px] border-[3px] border-dashed border-ink bg-paper/60 p-4 font-display font-extrabold uppercase transition-colors hover:bg-yellow"
            >
              <Plus size={28} strokeWidth={3} aria-hidden />
              Add a set
            </button>
          </li>
        </ul>
      </section>

      {/* ── Scroll to stack: a brick per theme ── */}
      {tower.length >= 2 && <ThemeTower layers={tower} total={formatINR(stats.totalSpent)} />}

      {/* ── Recently added ── */}
      {recent.length > 0 && (
        <section aria-labelledby="recent-title" className="relative">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <ScrollTitle id="recent-title" text="Fresh off the shelf" className="text-3xl sm:text-4xl" />
            <Link href="/collection" className="btn btn-sm">
              Whole vault <ArrowRight size={16} strokeWidth={3} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((s, i) => (
              <SetCard key={s.id} set={s} theme={get(s.themeId)} fields={fields} index={i} />
            ))}
          </div>
        </section>
      )}

      <BrickBurst word="KRAK!" />

      {/* ── Comic recap built from the collection ── */}
      <ComicStory panels={story} />
      {/* ── Wishlist peek ── */}
      <Panel label="Wishlist" labelTone="#FF9FD0" labelIcon={<Gift size={14} strokeWidth={3} aria-hidden />}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-[1.02rem]">
            {wishlist.length ? (
              <>
                <strong>{pluralise(wishlist.length, "set")}</strong> on your list, about <strong>{formatINR(wishTotal)}</strong> if you bought them all at your target prices.
              </>
            ) : (
              "Nothing on your wishlist yet. Park sets you want here and move them into the vault when you buy them."
            )}
          </p>
          <Link href="/wishlist" className="btn btn-sm bg-pink">
            {wishlist.length ? "Open wishlist" : "Start a wishlist"} <ArrowRight size={16} strokeWidth={3} />
          </Link>
        </div>
      </Panel>
    </div>
  );
}

function RecordCard({
  kicker,
  title,
  amount,
  href,
  tone,
  icon,
  extra,
}: {
  kicker: string;
  title: string;
  amount: number | null;
  href?: string;
  tone: string;
  icon: ReactNode;
  extra?: string;
}) {
  const body = (
    <>
      <div className="halftone-fade pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex items-center gap-4">
        <Starburst className="h-16 w-16 shrink-0" fill={tone} points={11}>
          {icon}
        </Starburst>
        <div className="min-w-0 flex-1">
          <p className="mono-meta text-ink/60">{kicker}</p>
          <p className="line-clamp-1 font-display text-xl font-extrabold leading-tight">{title}</p>
          {extra && <p className="text-sm text-ink/70">{extra}</p>}
        </div>
        <p className="shrink-0 font-display text-2xl font-extrabold">{amount != null ? compactINR(amount) : "—"}</p>
      </div>
    </>
  );
  const cls = "panel relative block overflow-hidden px-4 py-4 transition-transform hover:-translate-y-1";
  return href ? (
    <Link href={href} className={cls} aria-label={`${kicker}: ${title}${amount != null ? `, ${formatINR(amount)}` : ""}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function FirstRun() {
  const openAdd = useUI((s) => s.openAdd);
  const loadDemo = useVault((s) => s.loadDemo);
  const words = ["Every", "brick", "has", "a", "story."];
  return (
    <div className="relative">
      <section className="grid items-center gap-10 py-6 lg:grid-cols-2 lg:py-12">
        <div>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-4 inline-flex rounded-full border-[2.5px] border-ink bg-yellow px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.14em]"
          >
            Welcome to your LEGO command centre
          </motion.p>
          <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight sm:text-7xl">
            {words.map((w, i) => (
              <Fragment key={w}>
                {i > 0 && " "}
                <motion.span
                  className="misprint inline-block"
                  initial={{ opacity: 0, y: 60, rotate: i % 2 ? 8 : -8 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={popIn(0.4 + i * 0.16, 0.6)}
                >
                  {w}
                </motion.span>
              </Fragment>
            ))}
            <motion.span
              className="mt-2 block w-fit -rotate-2 rounded-xl border-[3px] border-ink bg-red px-3 py-1 shadow-comic"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={popIn(1.3, 0.6)}
            >
              Every set has a value.
            </motion.span>
          </h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-6 max-w-lg text-lg leading-relaxed text-ink/80">
            Log each set with what you paid and what you think it is worth. BRICKVAULT adds up your spending by theme, month and set, and keeps a history for every box.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-7 flex flex-wrap gap-3">
            <button type="button" className="btn btn-red btn-lg" onClick={() => openAdd()}>
              <Plus size={20} strokeWidth={3} /> Add your first set
            </button>
            <button
              type="button"
              className="btn btn-lg"
              onClick={() => {
                loadDemo(buildDemo());
                toast({ kind: "info", title: "Demo collection loaded", body: "Sample sets with illustrative prices. Remove them any time from the banner or the Data page." });
              }}
            >
              <Sparkles size={20} strokeWidth={2.6} /> Try demo data
            </button>
            <Link href="/settings" className="btn btn-ghost btn-lg">
              <Upload size={20} strokeWidth={2.6} /> Import
            </Link>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: 6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={popIn(0.5, 0.8)}
          className="relative"
        >
          <div className="panel relative overflow-hidden bg-sky p-6 sm:p-10">
            <div className="speedlines pointer-events-none absolute -inset-[40%] animate-spin-slow" aria-hidden />
            <div className="relative mx-auto flex max-w-md items-end justify-center gap-1 pt-6">
              <Minifig wave print="rupee" torso="#FF5C6C" legs="#2A1F45" hat="hair" hatColor="#8A5A2B" className="h-36 w-24" />
              <Minibuild name="house" className="h-56 w-auto" delay={0.8} />
              <Minifig flip mood="wow" print="star" torso="#A77BFF" legs="#FFD447" hat="helmet" hatColor="#FFFAF4" className="h-32 w-20" />
            </div>
          </div>
          <DoodleArrow className="absolute -left-14 top-6 hidden h-16 w-24 -scale-x-100 lg:block" />
          <Starburst className="absolute -right-4 -top-6 h-24 w-24 rotate-12" fill="#FFD447">
            <span className="sfx block text-base text-paper">START!</span>
          </Starburst>
        </motion.div>
      </section>

      <BrickBurst word="BUILD!" />

      <ScrollTitle text="How it works" className="mb-2 text-4xl sm:text-6xl" />
      <section className="mt-6 grid gap-5 md:grid-cols-3" aria-label="How it works">
        {[
          { n: 1, t: "Add a set", b: "Name and theme are enough. Price, pieces, condition and photos when you want.", c: "#FFD447" },
          { n: 2, t: "Watch it add up", b: "Total spent, spending per theme and per month update the moment you save.", c: "#7BF1C8" },
          { n: 3, t: "Track the value", b: "Note what each set is worth now and see your estimated gain or loss.", c: "#FF9FD0" },
        ].map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 30, rotate: i - 1 }}
            whileInView={{ opacity: 1, y: 0, rotate: (i - 1) * 0.8 }}
            viewport={{ once: true }}
            transition={popIn(0.2 + i * 0.12, 0.6)}
            className="panel p-5"
            style={{ background: s.c }}
          >
            <span className="sfx text-5xl text-paper">{s.n}</span>
            <h2 className="mt-2 font-display text-2xl font-extrabold uppercase">{s.t}</h2>
            <p className="mt-1.5 leading-relaxed text-ink/80">{s.b}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
