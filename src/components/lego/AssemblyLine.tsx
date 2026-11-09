"use client";

import { ArrowRight, Cog } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { SetCover } from "@/components/sets/SetBits";
import { ThemeBadge } from "@/components/ui/ThemeBadge";
import { useMotionAllowed } from "@/lib/hooks";
import { gsap, useGSAP } from "@/lib/gsap";
import { formatINR } from "@/lib/money";
import type { LegoSet, Theme } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

/*
 * Your sets ride a conveyor belt, oldest to newest, while you scroll down.
 * The page scroll drives the belt sideways; the set passing the middle lifts
 * off the belt and the gears turn with it. Reduced motion: a plain row you
 * can swipe.
 */
export function AssemblyLine({ sets, theme }: { sets: LegoSet[]; theme: (id: string) => Theme }) {
  const allowed = useMotionAllowed();
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);

  // The section is as tall as the belt is long, so one screen of scroll moves it one screen.
  useLayoutEffect(() => {
    if (!allowed) return;
    const measure = () => {
      if (track.current && stage.current) setTravel(Math.max(0, track.current.scrollWidth - stage.current.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [allowed, sets.length]);

  useGSAP(
    () => {
      if (!allowed || !travel) return;
      const q = gsap.utils.selector(root);
      const cards = q<HTMLElement>(".al-card");
      const lift = cards.map((c) => gsap.quickTo(c, "y", { duration: 0.35, ease: "power3.out" }));
      const tilt = cards.map((c) => gsap.quickTo(c, "rotation", { duration: 0.5, ease: "back.out(2)" }));
      const grow = cards.map((c) => gsap.quickTo(c, "scale", { duration: 0.4, ease: "back.out(2)" }));

      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            invalidateOnRefresh: true,
            onUpdate: () => {
              const mid = window.innerWidth / 2;
              cards.forEach((c, i) => {
                const r = c.getBoundingClientRect();
                const d = Math.min(1, Math.abs(r.left + r.width / 2 - mid) / (window.innerWidth * 0.45));
                const near = 1 - d;
                lift[i](-38 * near * near);
                tilt[i]((i % 2 ? 1 : -1) * 2.5 * near);
                grow[i](1 + 0.08 * near * near);
              });
            },
          },
        })
        .to(track.current, { x: () => -travel })
        .to(q(".al-belt"), { backgroundPositionX: () => -travel }, 0)
        .to(q(".al-gear"), { rotation: () => travel / 3 }, 0);
    },
    { scope: root, dependencies: [allowed, travel], revertOnUpdate: true },
  );

  const belt = (
    <div className="al-belt pointer-events-none absolute inset-x-0 bottom-6 h-7 border-y-[3px] border-ink bg-ink-soft" style={{ backgroundImage: "repeating-linear-gradient(90deg, #2A1F45 0 14px, transparent 14px 40px)" }} aria-hidden />
  );

  return (
    <section ref={root} aria-label="Your sets, oldest to newest" className="relative -mx-4 sm:-mx-6 lg:-mx-8" style={allowed && travel ? { height: `calc(100svh + ${travel}px)` } : undefined}>
      <div ref={stage} className={cn("overflow-hidden", allowed ? "sticky top-0 flex h-[100svh] flex-col justify-center pt-16" : "overflow-x-auto")}>
        <div className="relative pb-14 pt-8">
          {belt}
          <Cog className="al-gear absolute -bottom-1 left-2 h-16 w-16 fill-yellow text-ink" strokeWidth={1.6} aria-hidden />
          <Cog className="al-gear absolute -bottom-1 right-2 h-16 w-16 fill-yellow text-ink" strokeWidth={1.6} aria-hidden />
          <div ref={track} className="relative flex w-max items-end gap-5 px-6 sm:px-10 lg:px-[18vw]">
            {sets.map((s, i) => {
              const t = theme(s.themeId);
              return (
                <Link key={s.id} href={`/set?id=${s.id}`} className="al-card panel group block w-56 shrink-0 overflow-hidden sm:w-64" style={{ transformOrigin: "50% 100%" }}>
                  <div className="relative aspect-[4/3] border-b-[3px] border-ink">
                    <SetCover set={s} theme={t} className="h-full w-full" imgClassName="transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute left-2 top-2 rounded-md border-2 border-ink bg-yellow px-1.5 py-0.5 font-mono text-[0.66rem] font-extrabold">#{i + 1}</span>
                  </div>
                  <div className="space-y-1 p-3">
                    <ThemeBadge theme={t} size="sm" />
                    <h3 className="line-clamp-1 font-display text-lg font-extrabold leading-tight">{s.name}</h3>
                    <p className="flex justify-between gap-2 text-sm text-ink/70">
                      <span>{formatDate(s.purchaseDate ?? s.createdAt)}</span>
                      <span className="font-bold text-ink">{formatINR(s.purchasePrice, { fallback: "" })}</span>
                    </p>
                  </div>
                </Link>
              );
            })}
            <Link href="/collection" className="al-card flex h-48 w-44 shrink-0 flex-col items-center justify-center gap-2 rounded-[16px] border-[3px] border-dashed border-ink bg-paper/80 p-4 text-center font-display font-extrabold uppercase transition-colors hover:bg-yellow">
              <ArrowRight size={26} strokeWidth={3} aria-hidden />
              The whole vault
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
