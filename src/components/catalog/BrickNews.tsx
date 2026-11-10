"use client";

import { ArrowRight, ExternalLink, Newspaper, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ScrollTitle } from "@/components/lego/ScrollScenes";
import { Starburst } from "@/components/ui/Decor";
import { Segmented } from "@/components/ui/Fields";
import { StudRow } from "@/components/ui/Panel";
import { catalogHref, type Highlights, type HighlightSet, numbersIn, setKey, useHighlights } from "@/lib/catalog";
import { formatNumber } from "@/lib/money";
import { popIn } from "@/lib/motion";
import { cn, formatDate, pluralise, relativeDays } from "@/lib/utils";
import { CatalogCard, useOwnedKeys } from "./CatalogCard";

/**
 * Homepage news desk: Brickset headlines, a LEGO fact, and sets that are new or on the way.
 * Everything comes from the nightly catalog build, so it stays fresh with no server.
 */
export function BrickNews() {
  const { data } = useHighlights();
  // The homepage never breaks over news: no data, no section.
  if (!data) return null;
  return (
    <section aria-labelledby="news-title" className="relative space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ScrollTitle id="news-title" text="Hot off the press" className="text-4xl sm:text-5xl" />
        <Link href="/catalog" className="btn btn-sm">
          Every set ever <ArrowRight size={16} strokeWidth={3} />
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <Headlines news={data.news} className="lg:col-span-7" />
        <FunFact facts={data.facts} className="lg:col-span-5" />
      </div>
      <ComingSoon data={data} />
    </section>
  );
}

const tagOf = (title: string) => {
  const m = title.match(/^([^:]{3,28}):\s/);
  return m ? m[1] : "News";
};

function Headlines({ news, className }: { news: Highlights["news"]; className?: string }) {
  const today = formatDate(new Date().toISOString());
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: -1.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: -0.4 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={popIn(0.1, 0.7)}
      className={cn("panel relative overflow-hidden", className)}
    >
      <StudRow className="right-6" />
      <header className="flex items-end justify-between gap-3 border-b-[3px] border-ink bg-ink px-4 py-3 text-paper sm:px-5">
        <div>
          <p className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight sm:text-3xl">The Daily Brick</p>
          <p className="mono-meta mt-1 text-[0.62rem] text-yellow">{today} · Headlines from Brickset</p>
        </div>
        <Newspaper size={30} strokeWidth={2.4} className="shrink-0 text-yellow" aria-hidden />
      </header>
      {news.length === 0 ? (
        <p className="p-5 text-ink/70">No headlines right now. Check back tomorrow.</p>
      ) : (
        <ol className="divide-y-2 divide-dashed divide-ink/30">
          {news.slice(0, 6).map((n, i) => {
            const tag = tagOf(n.title);
            const title = tag === "News" ? n.title : n.title.slice(tag.length + 1).trim();
            const nums = numbersIn(n.title);
            return (
              <motion.li
                key={n.link}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={popIn(0.25 + i * 0.07, 0.5)}
                className="group flex items-start gap-3 px-4 py-3 sm:px-5"
              >
                <span className="mt-0.5 shrink-0 rotate-[-3deg] rounded-md border-2 border-ink px-1.5 py-0.5 font-mono text-[0.62rem] font-extrabold uppercase" style={{ background: ["#FFD447", "#62D2FF", "#FF9FD0", "#7BF1C8"][i % 4] }}>
                  {tag}
                </span>
                <div className="min-w-0 flex-1">
                  <a href={n.link} target="_blank" rel="noopener noreferrer" className="font-display text-[1.05rem] font-extrabold leading-snug decoration-[3px] underline-offset-2 hover:underline">
                    {title}
                    <ExternalLink size={13} strokeWidth={3} className="ml-1 inline-block align-baseline opacity-50" aria-label="(opens Brickset)" />
                  </a>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[0.78rem] text-ink/60">
                    {n.date && <time dateTime={n.date}>{relativeDays(n.date)}</time>}
                    {nums.map((num) => (
                      <Link key={num} href={catalogHref(num)} className="font-mono font-bold text-blue hover:underline">
                        #{num} in the catalog
                      </Link>
                    ))}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </motion.div>
  );
}

function FunFact({ facts, className }: { facts: Highlights["facts"]; className?: string }) {
  // A new fact each day; the button flips through the rest.
  const [i, setI] = useState(() => Math.floor(Date.now() / 86_400_000) % Math.max(1, facts.length));
  if (!facts.length) return null;
  const fact = facts[i % facts.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: 2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0.6 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={popIn(0.25, 0.7)}
      className={cn("panel relative flex flex-col overflow-hidden bg-yellow p-5 pt-20", className)}
    >
      <div className="speedlines pointer-events-none absolute -inset-[40%] opacity-40" aria-hidden />
      <Starburst className="absolute -left-3 -top-5 h-28 w-28 -rotate-12" fill="#FF5C6C" points={12}>
        <span className="sfx block text-[0.8rem] leading-none text-paper">DID YOU KNOW?</span>
      </Starburst>
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 18, rotate: -2, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, rotate: 2, transition: { duration: 0.14 } }}
          transition={{ type: "spring", visualDuration: 0.4, bounce: 0.4 }}
          className="relative mt-4 font-display text-2xl font-extrabold leading-tight sm:text-[1.7rem]"
          aria-live="polite"
        >
          {fact.text}
        </motion.p>
      </AnimatePresence>
      <div className="relative mt-auto flex flex-wrap gap-2 pt-5">
        <button type="button" className="btn btn-sm bg-paper" onClick={() => setI((n) => n + 1)}>
          <RefreshCw size={15} strokeWidth={3} /> Another one!
        </button>
        {fact.q && (
          <Link href={catalogHref(fact.q)} className="btn btn-sm btn-ghost">
            See the set <ArrowRight size={15} strokeWidth={3} />
          </Link>
        )}
      </div>
    </motion.div>
  );
}

type Shelf = "upcoming" | "fresh" | "newest";

function ComingSoon({ data }: { data: Highlights }) {
  const shelves = useMemo(() => {
    const out: Array<{ value: Shelf; label: string; sets: HighlightSet[] }> = [];
    if (data.upcoming.length) out.push({ value: "upcoming", label: `Coming ${data.thisYear + 1}`, sets: data.upcoming });
    if (data.fresh.length) out.push({ value: "fresh", label: "Just announced", sets: data.fresh });
    if (data.newest.length) out.push({ value: "newest", label: `Big ${data.thisYear} sets`, sets: data.newest });
    return out;
  }, [data]);
  const [shelf, setShelf] = useState<Shelf>(shelves[0]?.value ?? "upcoming");
  const { owned, wished } = useOwnedKeys();
  const current = shelves.find((s) => s.value === shelf) ?? shelves[0];
  if (!current) return null;

  const now = new Date();
  const newYear = new Date(now.getFullYear() + 1, 0, 1);
  const days = Math.ceil((newYear.getTime() - now.getTime()) / 86_400_000);

  return (
    <div className="panel relative overflow-hidden bg-sky/60 p-4 sm:p-5">
      <StudRow className="left-6" color="#62D2FF" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Starburst className="h-20 w-20 shrink-0 rotate-6" fill="#FFD447" points={11}>
            <span className="block font-display text-2xl font-extrabold leading-none">{days}</span>
            <span className="block font-mono text-[0.5rem] font-extrabold uppercase">days</span>
          </Starburst>
          <div>
            <h3 className="font-display text-2xl font-extrabold uppercase leading-none">Coming soon</h3>
            <p className="mt-1 text-sm text-ink/75">
              {data.upcomingCount ? `${pluralise(data.upcomingCount, "set")} already announced for ${data.thisYear + 1}, ${pluralise(days, "day")} to go.` : `${days} days until ${data.thisYear + 1}.`}{" "}
              {formatNumber(data.thisYearCount)} sets so far in {data.thisYear}.
            </p>
          </div>
        </div>
        {shelves.length > 1 && <Segmented label="Which sets" options={shelves.map(({ value, label }) => ({ value, label }))} value={current.value} onChange={setShelf} />}
      </div>
      <div className="-mx-4 mt-2 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:-mx-5 sm:px-5" key={current.value}>
        {current.sets.slice(0, 12).map((s, i) => (
          <div key={s.num} className="w-44 shrink-0 snap-start sm:w-52">
            <CatalogCard set={s} index={i} owned={owned.has(setKey(s.num))} wished={wished.has(setKey(s.num))} thisYear={data.thisYear} />
          </div>
        ))}
        <Link
          href={current.value === "upcoming" ? "/catalog?upcoming=1" : "/catalog"}
          className="mt-3 flex w-40 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[16px] border-[3px] border-dashed border-ink bg-paper/70 p-4 text-center font-display font-extrabold uppercase transition-colors hover:bg-yellow"
        >
          <ArrowRight size={26} strokeWidth={3} aria-hidden />
          See them all
        </Link>
      </div>
      {current.value === "fresh" && <p className="mono-meta text-[0.62rem] text-ink/60">Sets that appeared in the catalog in the last few months, newest first</p>}
    </div>
  );
}
