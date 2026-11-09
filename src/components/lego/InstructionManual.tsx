"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import DotGrid from "@/components/bits/DotGrid";
import { Starburst } from "@/components/ui/Decor";
import { useMotionAllowed } from "@/lib/hooks";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { BrickShape, BrickSvg, type BrickKind, geometry, U } from "./Brick";
import { Minifig } from "./Minifig";

/*
 * "Build the vault": a LEGO instruction booklet you turn with the scroll wheel.
 * Each step drops its parts in from above, they land with a squash, and the
 * parts box, step number and progress studs follow along. Scroll back and it
 * comes apart again. With reduced motion it is simply the finished page.
 */

type Spec = { cols: number; kind: BrickKind; color: string; name: string };
type Placed = Spec & { x: number; y: number };
type Step = { parts: Placed[]; note: string; sfx: string; sticker?: boolean; fig?: boolean };

const B = geometry({ kind: "brick" }).H;
const P = geometry({ kind: "plate" }).H;

const STONE: Spec = { cols: 3, kind: "brick", color: "#C9C3DD", name: "light stone" };
const DOOR: Spec = { cols: 3, kind: "brick", color: "#3B2F5E", name: "night blue" };

const STEPS: Step[] = [
  { note: "Lay the baseplate", sfx: "CLACK!", parts: [{ cols: 11, kind: "plate", color: "#2FCB8A", name: "green", x: 0, y: 0 }] },
  { note: "Build the side walls", sfx: "SNAP!", parts: [{ ...STONE, x: U, y: -B }, { ...STONE, x: 7 * U, y: -B }] },
  { note: "Fit the vault door", sfx: "KLIK!", parts: [{ ...DOOR, x: 4 * U, y: -B }] },
  { note: "Raise the walls", sfx: "SNAP!", parts: [{ ...STONE, x: U, y: -2 * B }, { ...DOOR, x: 4 * U, y: -2 * B }, { ...STONE, x: 7 * U, y: -2 * B }] },
  { note: "Apply sticker 1", sfx: "SHHK!", sticker: true, parts: [] },
  { note: "Cap it with a lintel", sfx: "CLACK!", parts: [{ cols: 9, kind: "plate", color: "#FF5C6C", name: "red", x: U, y: -2 * B - P }] },
  { note: "Start the roof", sfx: "SNAP!", parts: [{ cols: 7, kind: "brick", color: "#4062FF", name: "blue", x: 2 * U, y: -3 * B - P }] },
  { note: "Keep stacking", sfx: "SNAP!", parts: [{ cols: 5, kind: "brick", color: "#4062FF", name: "blue", x: 3 * U, y: -4 * B - P }] },
  { note: "Almost there", sfx: "KLIK!", parts: [{ cols: 3, kind: "brick", color: "#FFD447", name: "yellow", x: 4 * U, y: -5 * B - P }] },
  { note: "Crown it in gold", sfx: "TING!", parts: [{ cols: 1, kind: "round", color: "#E8B52E", name: "gold", x: 5 * U, y: -6 * B - P }] },
  { note: "Add a minifigure", sfx: "HEY!", fig: true, parts: [] },
];

const VIEW = { x: -10, y: -6 * B - P - 22, w: 11 * U + 2 * U + 20, h: 6 * B + P + 22 + 2 * U * 0.36 + P + 26 };

/** "2x", "3×2 brick", for the parts box. */
function partsList(step: Step) {
  const groups = new Map<string, { qty: number; spec: Spec }>();
  for (const p of step.parts) {
    const key = `${p.cols}-${p.kind}-${p.color}`;
    const g = groups.get(key);
    if (g) g.qty++;
    else groups.set(key, { qty: 1, spec: p });
  }
  return [...groups.values()];
}

const partName = (s: Spec) => (s.kind === "round" ? "1×1 round brick" : `${s.cols}×2 ${s.kind}`);

export function InstructionManual({ title = "Build the vault", outro }: { title?: string; outro?: React.ReactNode }) {
  const allowed = useMotionAllowed();
  const root = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const total = STEPS.length;
  const pieceCount = useMemo(() => STEPS.reduce((n, s) => n + s.parts.length, 0), []);

  useGSAP(
    () => {
      if (!allowed) return;
      const q = gsap.utils.selector(root);
      gsap.set(q(".im-piece"), { y: -260, autoAlpha: 0, transformOrigin: "50% 100%" });
      gsap.set(q(".im-sticker"), { scale: 0, rotation: -90, transformOrigin: "50% 50%" });
      gsap.set(q(".im-fig"), { y: -220, autoAlpha: 0 });
      gsap.set(q(".im-callout, .im-num, .im-sfx, .im-done"), { autoAlpha: 0 });
      gsap.set(q(".im-callout"), { scale: 0.7, rotation: -4 });
      gsap.set(q(".im-sfx"), { scale: 0.2 });
      gsap.set(q(".im-stud"), { backgroundColor: "#FFFAF4" });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.7,
          onToggle: (self) => setOnScreen(self.isActive),
        },
      });

      STEPS.forEach((step, i) => {
        const at = `s${i}`;
        tl.addLabel(at);
        // Page furniture: step number and parts box swap in like a turned page.
        if (i > 0) tl.to(q(`.im-num-${i - 1}, .im-callout-${i - 1}, .im-sfx-${i - 1}`), { autoAlpha: 0, duration: 0.15 }, at);
        tl.to(q(`.im-num-${i}`), { autoAlpha: 1, duration: 0.15 }, at);
        tl.to(q(`.im-callout-${i}`), { autoAlpha: 1, scale: 1, rotation: i % 2 ? 2 : -2, duration: 0.35, ease: "back.out(2.4)" }, at);
        tl.to(q(`.im-stud-${i}`), { backgroundColor: "#FFD447", duration: 0.1 }, at);

        const land = `${at}+=0.3`;
        q(`.im-piece-${i}`).forEach((el, k) => {
          const t = `${land}+=${k * 0.18}`;
          // Fall stretched, squash on impact, wobble to rest.
          tl.to(el, { autoAlpha: 1, duration: 0.05 }, t)
            .fromTo(el, { y: -260, scaleY: 1.12, scaleX: 0.92 }, { y: 0, scaleY: 1.12, scaleX: 0.92, duration: 0.45, ease: "power2.in" }, t)
            .to(el, { scaleY: 0.8, scaleX: 1.12, duration: 0.08, ease: "power1.out" }, `${t}+=0.45`)
            .to(el, { scaleY: 1, scaleX: 1, duration: 0.3, ease: "elastic.out(1.1, 0.45)" }, `${t}+=0.53`);
        });
        if (step.sticker) tl.to(q(".im-sticker"), { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2)" }, land);
        if (step.fig) tl.to(q(".im-fig"), { y: 0, autoAlpha: 1, duration: 0.55, ease: "bounce.out" }, land);
        tl.to(q(`.im-sfx-${i}`), { autoAlpha: 1, scale: 1, rotation: i % 2 ? 8 : -8, duration: 0.25, ease: "back.out(3)" }, `${land}+=0.42`);
        tl.to({}, { duration: 0.6 }); // a beat to look at each step
      });

      // Finale: the finished build takes a bow.
      tl.addLabel("done")
        .to(q(`.im-sfx-${total - 1}`), { autoAlpha: 0, duration: 0.15 }, "done")
        .to(q(".im-done"), { autoAlpha: 1, duration: 0.2 }, "done")
        .fromTo(q(".im-done-burst"), { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(2.2)" }, "done")
        .to(q(".im-model"), { y: -10, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1 }, "done+=0.1")
        .to({}, { duration: 0.8 });

      // Pages above can change height after load (fonts, images), so re-measure once settled.
      const t = setTimeout(() => ScrollTrigger.refresh(), 600);
      return () => clearTimeout(t);
    },
    { scope: root, dependencies: [allowed], revertOnUpdate: true },
  );

  return (
    <section
      ref={root}
      aria-label={`${title}: a ${total}-step LEGO instruction booklet`}
      className="relative"
      style={allowed ? { height: `${total * 62 + 110}vh` } : undefined}
    >
      <div className={cn(allowed && "sticky top-0 flex h-[100svh] items-center pb-[6.5rem] pt-[4.75rem] lg:py-24")}>
        <div className="panel relative w-full overflow-hidden bg-paper" style={{ backgroundImage: "linear-gradient(rgb(42 31 69 / .05) 1px, transparent 1px), linear-gradient(90deg, rgb(42 31 69 / .05) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
          {/* Booklet header */}
          <div className="flex items-center justify-between gap-3 border-b-[3px] border-ink bg-yellow px-4 py-2.5 sm:px-6">
            <p className="font-display text-lg font-extrabold uppercase leading-none sm:text-2xl">{title}</p>
            <p className="mono-meta shrink-0 text-[0.62rem]">
              Bag 1 · {pieceCount} pcs · Ages 4–99
            </p>
          </div>

          <div className="grid gap-3 p-3 sm:gap-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-8">
            {/* Stage: the build sits on a springy baseplate */}
            <div className="relative min-h-[13rem] sm:min-h-[22rem]">
              <div className="absolute inset-0 overflow-hidden rounded-xl border-[3px] border-ink bg-mint/40" aria-hidden>
                {allowed && <DotGrid dotSize={7} gap={22} baseColor="#9BE7CF" activeColor="#FFD447" proximity={110} shockRadius={220} shockStrength={4} paused={!onScreen} intro={false} glow={0.2} />}
              </div>
              {/* Step number, top-left like the real booklets */}
              <div className="pointer-events-none absolute left-3 top-2 z-10 h-16 w-24 sm:h-24 sm:w-32">
                {STEPS.map((_, i) => (
                  <span key={i} className={cn("im-num absolute inset-0 font-display text-6xl font-extrabold leading-none tracking-tighter sm:text-8xl", `im-num-${i}`, !allowed && i !== total - 1 && "hidden")}>
                    {i + 1}
                  </span>
                ))}
              </div>
              <div className="relative flex h-full items-end justify-center px-2 pb-3 pt-14 sm:pt-16">
                <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} className="im-model relative h-auto w-full max-w-[34rem] overflow-visible" role="img" aria-label="A small LEGO vault with a gold dome and a minifigure">
                  <ellipse cx={(11 * U) / 2 + U / 2} cy={2 * U * 0.36 + P + 10} rx={6.5 * U} ry="9" fill="#2A1F45" opacity=".14" />
                  {STEPS.map((step, i) =>
                    step.parts.map((p, k) => (
                      <g key={`${i}-${k}`} className={cn("im-piece", `im-piece-${i}`)}>
                        <BrickShape cols={p.cols} rows={2} kind={p.kind} color={p.color} x={p.x} y={p.y} />
                      </g>
                    )),
                  )}
                  <VaultDial />
                </svg>
                <div className="im-fig absolute bottom-3 right-[4%] h-24 w-16 sm:h-32 sm:w-20">
                  <Minifig wave print="rupee" torso="#FFD447" legs="#4062FF" hat="cap" hatColor="#FF5C6C" className="h-full w-full" />
                </div>
                {STEPS.map((step, i) => (
                  <span key={i} className={cn("im-sfx sfx pointer-events-none absolute right-[8%] top-6 text-3xl text-red sm:text-5xl", `im-sfx-${i}`, !allowed && "hidden")} aria-hidden>
                    {step.sfx}
                  </span>
                ))}
                <div className={cn("im-done pointer-events-none absolute right-2 top-2 sm:right-4 sm:top-4", !allowed && "hidden")} aria-hidden>
                  <Starburst className="im-done-burst h-28 w-28 sm:h-36 sm:w-36" fill="#FF5C6C" points={13}>
                    <span className="sfx block text-2xl text-paper sm:text-3xl">BUILT!</span>
                  </Starburst>
                </div>
              </div>
            </div>

            {/* Parts box and progress */}
            <div className="flex flex-col gap-4">
              <div className="relative min-h-[6.75rem] sm:min-h-[11rem]">
                {STEPS.map((step, i) => (
                  <div key={i} className={cn("im-callout absolute inset-0 rounded-xl border-[3px] border-ink bg-paper p-3 shadow-comic", `im-callout-${i}`, !allowed && i !== total - 1 && "hidden")}>
                    <p className="mono-meta text-[0.62rem] text-ink/60">
                      Step {i + 1} of {total}
                    </p>
                    <p className="font-display text-base font-extrabold uppercase leading-tight sm:text-lg">{step.note}</p>
                    <ul className="mt-1.5 flex flex-wrap items-end gap-3 sm:mt-2">
                      {partsList(step).map(({ qty, spec }) => (
                        <li key={partName(spec) + spec.color} className="flex items-end gap-1.5">
                          <BrickSvg cols={Math.min(spec.cols, 4)} rows={2} kind={spec.kind} color={spec.color} size={spec.kind === "round" ? 30 : 44} />
                          <span className="font-mono text-sm font-extrabold">{qty}x</span>
                          <span className="sr-only">
                            {partName(spec)}, {spec.name}
                          </span>
                        </li>
                      ))}
                      {step.sticker && <li className="rounded-md border-2 border-dashed border-ink px-2 py-1 font-mono text-xs font-bold">Sticker sheet · 1</li>}
                      {step.fig && <li className="font-mono text-xs font-bold">1x minifigure</li>}
                    </ul>
                  </div>
                ))}
              </div>
              <div aria-hidden>
                <p className="mono-meta mb-1.5 hidden text-[0.62rem] text-ink/60 sm:block">Progress</p>
                <div className="flex flex-wrap gap-1.5">
                  {STEPS.map((_, i) => (
                    <span key={i} className={cn("im-stud h-3 w-5 rounded-t-md border-2 border-ink sm:h-4 sm:w-6", `im-stud-${i}`, !allowed && "bg-yellow")} />
                  ))}
                </div>
              </div>
              {outro && <div className="mt-auto hidden sm:block">{outro}</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Sticker 1: a vault dial printed across the door. */
function VaultDial() {
  const cx = 5.5 * U;
  const cy = -B + 2 * U * 0.36 - 2;
  return (
    <g className="im-sticker">
      <circle cx={cx} cy={cy} r="17" fill="#FFD447" stroke="#2A1F45" strokeWidth="2.6" />
      {[0, 60, 120].map((a) => (
        <Fragment key={a}>
          <line x1={cx} y1={cy} x2={cx + 15 * Math.cos((a * Math.PI) / 180)} y2={cy + 15 * Math.sin((a * Math.PI) / 180)} stroke="#2A1F45" strokeWidth="2.2" />
          <line x1={cx} y1={cy} x2={cx - 15 * Math.cos((a * Math.PI) / 180)} y2={cy - 15 * Math.sin((a * Math.PI) / 180)} stroke="#2A1F45" strokeWidth="2.2" />
        </Fragment>
      ))}
      <circle cx={cx} cy={cy} r="8" fill="#FFFAF4" stroke="#2A1F45" strokeWidth="2.2" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#2A1F45">
        ₹
      </text>
    </g>
  );
}
