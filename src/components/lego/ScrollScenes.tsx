"use client";

import {
  AnimatePresence,
  motion,
  type MotionValue,
  useMotionValueEvent,
  useReducedMotionConfig,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { Fragment, type ReactNode, useRef, useState } from "react";
import { dropLand, popIn } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { brickBox, BrickShape, BrickSvg, geometry, U } from "./Brick";
import { Minibuild } from "./Minibuild";
import { Minifig, type MinifigProps } from "./Minifig";

/*
 * Scroll-driven LEGO scenes. Bricks drop with cartoon squash and stretch,
 * and scroll-linked motion runs through a spring so it lags and settles.
 */

const PALETTE = ["#FF5C6C", "#FFD447", "#4062FF", "#2FCB8A", "#A77BFF", "#FF9548", "#62D2FF", "#FF9FD0"];

/* ───────────── Scroll progress built from bricks (whole site) ───────────── */

const BAR = 24;

export function ScrollBrickBar() {
  const { scrollYProgress } = useScroll();
  const [n, setN] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setN(Math.round(v * BAR)));
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex h-[9px]" aria-hidden>
      {Array.from({ length: BAR }, (_, i) => (
        <span
          key={i}
          className="h-full flex-1 border-b-[3px] border-r-2 border-ink"
          style={{
            background: PALETTE[i % PALETTE.length],
            transform: i < n ? "scaleY(1)" : "scaleY(0)",
            transformOrigin: "top",
            transition: "transform 320ms cubic-bezier(.34, 1.56, .64, 1)",
            boxShadow: "inset 3px 2px 0 rgb(255 255 255 / .4)",
          }}
        />
      ))}
    </div>
  );
}

/* ───────────── Heading whose words drop in when scrolled to ───────────── */

export function ScrollTitle({ text, className, id }: { text: string; className?: string; id?: string }) {
  const words = text.split(" ");
  return (
    <h2 id={id} className={cn("font-display uppercase leading-[0.95]", className)}>
      {words.map((w, i) => (
        <Fragment key={`${w}-${i}`}>
          {i > 0 && " "}
          <motion.span
            className="inline-block"
            initial={dropLand(0, -70).initial}
            whileInView={dropLand(0, -70).animate}
            viewport={{ once: true, margin: "-40px" }}
            transition={dropLand(i * 0.12, -70).transition}
            style={{ originY: 1 }}
          >
            {w}
          </motion.span>
        </Fragment>
      ))}
    </h2>
  );
}

/* ───────────── Ground of bricks with a minifig strolling across ───────────── */

export function BrickDivider({ fig, count = 22, className }: { fig?: MinifigProps; count?: number; className?: string }) {
  const g = geometry({ cols: 2, rows: 1 });
  const b = brickBox({ cols: 2, rows: 1 });
  const W = count * g.W + g.dx + 4;
  return (
    <div className={cn("relative -mx-2 overflow-x-clip pt-24 [container-type:inline-size]", className)} aria-hidden>
      <div className="animate-walk-across absolute left-0 top-0">
        <div className="animate-waddle">
          <Minifig wave={false} mood="grin" print="brick" torso="#4062FF" legs="#2A1F45" hat="cap" hatColor="#FF5C6C" {...fig} className="h-24 w-[3.9rem]" />
        </div>
      </div>
      <motion.svg
        viewBox={`${b.x0} ${b.y0} ${W} ${b.y1 - b.y0}`}
        className="block h-auto w-full overflow-visible"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-30px" }}
      >
        {Array.from({ length: count }, (_, i) => (
          <motion.g
            key={i}
            custom={i}
            variants={{
              hidden: { y: -90, opacity: 0 },
              show: (n: number) => ({ y: 0, opacity: 1, transition: { delay: n * 0.05, type: "spring", visualDuration: 0.45, bounce: 0.5 } }),
            }}
          >
            <BrickShape cols={2} rows={1} color={PALETTE[(i * 3) % PALETTE.length]} x={i * g.W} />
          </motion.g>
        ))}
      </motion.svg>
    </div>
  );
}

/* ───────────── Scroll to stack: one brick per theme ───────────── */

export interface TowerLayer {
  key: string;
  name: string;
  color: string;
  /** 0..1, sets how wide the brick is */
  weight: number;
  amount: string;
  detail: string;
  href?: string;
}

const SNAPS = ["SNAP!", "KLIK!", "CLACK!", "THUNK!", "POP!", "BAM!", "KLAK!", "ZIP!"];

export function ThemeTower({ layers, total }: { layers: TowerLayer[]; total: string }) {
  const reduce = useReducedMotionConfig();
  const ref = useRef<HTMLElement>(null);
  const n = layers.length;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [k, setK] = useState(reduce ? n : 0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!reduce) setK(Math.min(n, Math.floor(v * (n + 0.6))));
  });
  const shown = reduce ? n : Math.min(k, n);

  // Widest brick (most spend) is the base.
  const maxCols = 8;
  const cols = layers.map((l) => Math.max(2, Math.min(maxCols, Math.round(2 + l.weight * 9))));
  const H = geometry({ cols: 2, rows: 2 }).H;
  // Same depth as the baseplate, so each brick sits exactly one height above the last.
  const bricks = layers.map((l, i) => ({ ...l, cols: cols[i], x: ((maxCols + 2 - cols[i]) / 2) * U, y: -(i + 1) * H }));
  const top = bricks.length ? bricks[bricks.length - 1].y - 30 : -60;
  const box = brickBox({ cols: maxCols + 2, rows: 2, kind: "plate" });
  const vb = `${box.x0 - 10} ${top - 50} ${box.x1 - box.x0 + 20} ${box.y1 - top + 60}`;
  const cur = shown > 0 ? layers[shown - 1] : null;
  const done = shown === n;

  return (
    <section ref={ref} aria-labelledby="tower-title" className="relative" style={{ height: reduce ? "auto" : `${110 + n * 32}vh` }}>
      <div className={cn(!reduce && "sticky top-[5.6rem] h-[calc(100svh-12rem)] lg:h-[calc(100svh-7rem)]", "min-h-[30rem]")}>
        <div className="panel relative grid h-full grid-rows-[auto_1fr] overflow-hidden bg-sky lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:grid-rows-1">
          <div className="speedlines pointer-events-none absolute -inset-[40%] opacity-60" aria-hidden />
          <div className="halftone-fade pointer-events-none absolute inset-0" aria-hidden />

          {/* caption side */}
          <div className="relative z-10 flex flex-col gap-3 p-4 sm:p-6 lg:justify-center lg:p-8">
            <p className="caption-box w-fit">Meanwhile, in your vault…</p>
            <h2 id="tower-title" className="font-display text-3xl uppercase leading-[0.95] sm:text-5xl">
              Built from your spending
            </h2>
            <div className="relative min-h-[6.5rem] sm:min-h-[8rem]" aria-hidden>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={cur?.key ?? "start"}
                  initial={{ opacity: 0, x: -60, rotate: -4 }}
                  animate={{ opacity: 1, x: 0, rotate: -1 }}
                  exit={{ opacity: 0, x: 60, rotate: 4, transition: { duration: 0.2, ease: "easeIn" } }}
                  transition={{ type: "spring", visualDuration: 0.4, bounce: 0.4 }}
                  className="rounded-xl border-[3px] border-ink bg-paper p-3 shadow-comic sm:p-4"
                >
                  {cur ? (
                    <>
                      <p className="mono-meta text-ink/60">
                        Brick {shown} of {n}
                      </p>
                      <p className="mt-1 flex items-center gap-2 font-display text-xl uppercase leading-tight sm:text-2xl">
                        <span className="h-4 w-4 shrink-0 rounded border-2 border-ink" style={{ background: cur.color }} />
                        <span className="truncate">{cur.name}</span>
                      </p>
                      <p className="font-display text-2xl sm:text-3xl">{cur.amount}</p>
                      <p className="text-sm text-ink/70">{cur.detail}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-xl uppercase sm:text-2xl">Scroll to stack</p>
                      <p className="mt-1 text-sm text-ink/75">Every theme you spend on becomes a brick. The more you spent, the wider the brick.</p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <ul className="sr-only">
              {layers.map((l) => (
                <li key={l.key}>
                  {l.name}: {l.amount}, {l.detail}
                </li>
              ))}
            </ul>
            <p className={cn("font-display text-lg uppercase transition-opacity", done ? "opacity-100" : "opacity-0")} aria-hidden={!done}>
              Total tower: {total}
            </p>
          </div>

          {/* build side */}
          <div className="relative z-10 flex min-h-0 items-end justify-center px-4 pb-4 lg:pb-8" aria-hidden>
            <svg viewBox={vb} className="h-full max-h-full w-auto max-w-full overflow-visible">
              <ellipse cx={(box.x0 + box.x1) / 2} cy={box.y1 + 4} rx={(box.x1 - box.x0) / 2 + 6} ry="9" fill="#2A1F45" opacity=".2" />
              <BrickShape cols={maxCols + 2} rows={2} kind="plate" color="#2FCB8A" />
              <AnimatePresence>
                {bricks.slice(0, shown).map((b2, i) => (
                  <motion.g
                    key={b2.key}
                    initial={reduce ? false : dropLand(0, -420).initial}
                    animate={dropLand(0, -420).animate}
                    exit={{ y: -420, opacity: 0, transition: { duration: 0.35, ease: "backIn" } }}
                    transition={dropLand(0, -420, 0.7).transition}
                    style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
                  >
                    <BrickShape cols={b2.cols} rows={2} color={b2.color} x={b2.x} y={b2.y} />
                  </motion.g>
                ))}
              </AnimatePresence>
            </svg>
            <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6">
              <Minifig jumpKey={shown} mood={done ? "wow" : "grin"} wave={done} print="rupee" torso="#FFD447" legs="#FF5C6C" hat="helmet" hatColor="#FFFAF4" className="h-24 w-16 sm:h-32 sm:w-20" />
            </div>
            <AnimatePresence>
              {shown > 0 && (
                <motion.span
                  key={shown}
                  className="pointer-events-none absolute left-4 top-2 sm:left-10 sm:top-6"
                  initial={{ scale: 0, rotate: -30, opacity: 1 }}
                  animate={{ scale: [0, 1.35, 1], rotate: -8, opacity: 1 }}
                  exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <span className="sfx block text-4xl sm:text-6xl">{done ? "BUILT!" : SNAPS[(shown - 1) % SNAPS.length]}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Bricks fly in, click into a pyramid, then scatter ───────────── */

const PYRAMID = [4, 3, 2, 1];

function FlyingBrick({ q, i, ax, ay, color, size }: { q: MotionValue<number>; i: number; ax: number; ay: number; color: string; size: number }) {
  const a1 = (i * 137.5 * Math.PI) / 180;
  const a2 = a1 + 2.1;
  const r1 = 520 + (i % 3) * 120;
  const r2 = 560 + (i % 4) * 90;
  const x = useTransform(q, [0, 0.42, 0.58, 1], [Math.cos(a1) * r1, ax, ax, Math.cos(a2) * r2]);
  const y = useTransform(q, [0, 0.42, 0.58, 1], [Math.sin(a1) * 260, ay, ay, Math.sin(a2) * 260]);
  const rotate = useTransform(q, [0, 0.42, 0.58, 1], [(i % 2 ? 1 : -1) * 200, 0, 0, (i % 2 ? -1 : 1) * 240]);
  return (
    <motion.div className="absolute left-1/2 top-1/2" style={{ x, y, rotate, marginLeft: -size / 2, marginTop: -size / 2 }}>
      <BrickSvg cols={2} rows={1} color={color} size={size} />
    </motion.div>
  );
}

export function BrickBurst({ word = "KRAK!", caption }: { word?: string; caption?: ReactNode }) {
  const reduce = useReducedMotionConfig();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 110, damping: 16 });
  const q = useTransform(smooth, (v) => (reduce ? 0.5 : v));
  const sfxScale = useTransform(q, [0.36, 0.44, 0.56, 0.64], [0, 1.15, 1, 0]);
  const size = 84;
  const g = geometry({ cols: 2, rows: 1 });
  const k = size / (brickBox({ cols: 2, rows: 1 }).x1 - brickBox({ cols: 2, rows: 1 }).x0);
  const pieces: Array<{ ax: number; ay: number }> = [];
  PYRAMID.forEach((count, row) => {
    for (let c = 0; c < count; c++) pieces.push({ ax: (c - (count - 1) / 2) * g.W * k, ay: 50 - row * g.H * k });
  });
  return (
    <div ref={ref} className="relative -mx-4 h-[26rem] overflow-x-clip sm:-mx-6 lg:-mx-8" aria-hidden>
      {pieces.map((p, i) => (
        <FlyingBrick key={i} q={q} i={i} ax={p.ax} ay={p.ay} color={PALETTE[(i * 5) % PALETTE.length]} size={size} />
      ))}
      <motion.div className="absolute left-1/2 top-[18%] -translate-x-1/2" style={{ scale: sfxScale }}>
        <span className="sfx block -rotate-6 whitespace-nowrap text-6xl sm:text-8xl">{word}</span>
      </motion.div>
      {caption && <div className="absolute inset-x-0 bottom-2 text-center">{caption}</div>}
    </div>
  );
}

/* ───────────── Comic page: panels slam in as you scroll ───────────── */

export interface StoryPanel {
  caption: string;
  title: string;
  body: string;
  sfx: string;
  tone: string;
  fig: MinifigProps;
  href?: string;
}

const SPANS = ["md:col-span-4", "md:col-span-2", "md:col-span-2", "md:col-span-4"];
const TILTS = [-1.2, 1.5, 1, -1.5];

export function ComicStory({ panels }: { panels: StoryPanel[] }) {
  return (
    <section aria-labelledby="story-title" className="relative">
      <div className="mb-6 flex items-end gap-4">
        <ScrollTitle id="story-title" text="The story so far" className="text-4xl sm:text-6xl" />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
        {panels.map((p, i) => (
          <motion.article
            key={p.title}
            initial={{ opacity: 0, scale: 0.4, rotate: i % 2 ? 10 : -10, y: 80 }}
            whileInView={{ opacity: 1, scale: 1, rotate: TILTS[i % 4], y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ type: "spring", visualDuration: 0.55, bounce: 0.4, delay: (i % 2) * 0.15 }}
            className={cn("panel relative min-h-[15rem] overflow-hidden", SPANS[i % 4])}
            style={{ background: p.tone }}
          >
            <div className="halftone pointer-events-none absolute inset-0 opacity-30" aria-hidden />
            <div className="speedlines pointer-events-none absolute -inset-[60%] opacity-40" aria-hidden />
            <div className="relative z-10 flex h-full flex-col gap-2 p-4 pr-24 sm:p-5 sm:pr-32">
              <p className="caption-box w-fit">{p.caption}</p>
              <h3 className="mt-1 font-display text-2xl uppercase leading-[1] sm:text-3xl">{p.title}</h3>
              <p className="max-w-md font-medium leading-snug text-ink/85">{p.body}</p>
              {p.href && (
                <Link href={p.href} className="btn btn-sm mt-auto w-fit bg-paper">
                  Take a look
                </Link>
              )}
            </div>
            <motion.div
              className="absolute -bottom-2 right-2 sm:right-4"
              initial={{ y: 160 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={popIn(0.35 + (i % 2) * 0.15, 0.6)}
              aria-hidden
            >
              <Minifig {...p.fig} className="h-32 w-20 sm:h-40 sm:w-[6.5rem]" />
            </motion.div>
            <motion.span
              className="pointer-events-none absolute right-3 top-3 z-20 sm:right-6"
              initial={{ scale: 0, rotate: -30 }}
              whileInView={{ scale: [0, 1.4, 1], rotate: 10 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.55 + (i % 2) * 0.15, ease: "easeOut" }}
              aria-hidden
            >
              <span className="sfx block text-3xl sm:text-4xl">{p.sfx}</span>
            </motion.span>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Footer: a little LEGO town builds itself ───────────── */

export function BrickFooter() {
  return (
    <footer className="relative mt-24" aria-label="Site footer">
      <div className="panel relative overflow-hidden bg-yellow">
        <div className="speedlines pointer-events-none absolute -inset-[50%] opacity-50" aria-hidden />
        <div className="halftone-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative z-10 grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_1.3fr] lg:items-end">
          <div>
            <p className="caption-box w-fit bg-paper">To be continued…</p>
            <ScrollTitle text="Every brick has a story." className="mt-4 text-3xl sm:text-5xl" />
            <p className="mt-3 max-w-md font-medium text-ink/80">Every set has a value. Keep adding sets and BRICKVAULT keeps the numbers straight.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/collection" className="btn btn-sm bg-paper">
                Open the vault
              </Link>
              <Link href="/settings" className="btn btn-sm bg-paper">
                Back up your data
              </Link>
            </div>
          </div>
          <div className="flex items-end justify-center gap-1 sm:gap-3" aria-hidden>
            <Minibuild name="tree" className="h-24 w-auto sm:h-32" inView delay={0.1} />
            <motion.div initial={{ y: 140 }} whileInView={{ y: 0 }} viewport={{ once: true }} transition={popIn(0.9, 0.6)}>
              <Minifig wave print="star" torso="#A77BFF" legs="#2A1F45" hat="hair" hatColor="#8A5A2B" className="h-24 w-16 sm:h-28 sm:w-[4.5rem]" />
            </motion.div>
            <Minibuild name="house" className="h-32 w-auto sm:h-44" inView delay={0.3} />
            <Minibuild name="rocket" className="h-32 w-auto sm:h-44" inView delay={0.6} />
            <motion.div className="hidden sm:block" initial={{ y: 140 }} whileInView={{ y: 0 }} viewport={{ once: true }} transition={popIn(1.2, 0.6)}>
              <Minifig flip mood="wow" print="rupee" torso="#FF5C6C" legs="#4062FF" hat="crown" className="h-28 w-[4.5rem]" />
            </motion.div>
            <Minibuild name="tower" className="hidden h-36 w-auto sm:block" inView delay={0.9} />
          </div>
        </div>
        <div className="relative z-10 flex h-7 items-start gap-[10px] overflow-hidden border-t-[3px] border-ink bg-[#2FCB8A] px-2" aria-hidden>
          {Array.from({ length: 60 }, (_, i) => (
            <span key={i} className="-mt-[2px] h-3 w-6 shrink-0 rounded-b-md border-[2.5px] border-t-0 border-ink bg-[#5BE0A6]" />
          ))}
        </div>
      </div>
      <p className="mono-meta mt-4 text-center text-ink/55">BRICKVAULT · not affiliated with the LEGO Group · your data stays in this browser</p>
    </footer>
  );
}
