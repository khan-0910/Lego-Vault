"use client";

import { Database, Ellipsis, Gauge, Gift, House, LayoutGrid, Library, Plus, Search, Shapes } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { SetFormModal } from "@/components/sets/SetForm";
import { CountUp } from "@/components/ui/CountUp";
import { FloatingBricks } from "@/components/lego/FloatingBricks";
import { BrickFooter, ScrollBrickBar } from "@/components/lego/ScrollScenes";
import { Starburst } from "@/components/ui/Decor";
import { Logo } from "@/components/ui/Logo";
import { BrickLoader } from "@/components/ui/States";
import { Toasts } from "@/components/ui/Toasts";
import { computeStats, inScope } from "@/lib/calc";
import { useVaultHydration } from "@/lib/hooks";
import { compactINR, formatINR } from "@/lib/money";
import { useVault } from "@/lib/store";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";

export const NAV = [
  { href: "/", label: "HQ", Icon: House },
  { href: "/collection", label: "Vault", Icon: LayoutGrid },
  { href: "/value", label: "Value", Icon: Gauge },
  { href: "/catalog", label: "Catalog", Icon: Library },
  { href: "/wishlist", label: "Wishlist", Icon: Gift },
  { href: "/themes", label: "Themes", Icon: Shapes },
  { href: "/settings", label: "Data", Icon: Database },
] as const;

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href) || (href === "/collection" && /^\/set\/?$/.test(path)));

export function AppShell({ children }: { children: ReactNode }) {
  const ready = useVaultHydration();
  const motionPref = useVault((s) => s.prefs.motion);
  const setPalette = useUI((s) => s.setPalette);
  const openAdd = useUI((s) => s.openAdd);

  useEffect(() => {
    document.documentElement.dataset.motion = motionPref;
  }, [motionPref]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(!useUI.getState().paletteOpen);
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n" && !useUI.getState().form.open) {
        e.preventDefault();
        openAdd();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPalette, openAdd]);

  return (
    <MotionConfig reducedMotion={motionPref === "reduced" ? "always" : motionPref === "full" ? "never" : "user"}>
      <Backdrop />
      <ScrollBrickBar />
      <a href="#main" className="skip-link btn btn-yellow">
        Skip to content
      </a>
      <TopBar ready={ready} />
      {ready && <DemoBanner />}
      <main id="main" className="relative mx-auto overflow-x-clip w-full max-w-[1400px] px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-20">
        {ready ? children : <BrickLoader label="Opening the vault…" />}
        {ready && <BrickFooter />}
      </main>
      <MobileNav />
      {ready && <SetFormModal />}
      {ready && <CommandPalette />}
      <Toasts />
    </MotionConfig>
  );
}

function Backdrop() {
  return (
    <>
      <div className="print-bg" aria-hidden />
      <FloatingBricks />
    </>
  );
}

function SpendTicker({ ready }: { ready: boolean }) {
  const sets = useVault((s) => s.sets);
  const spent = useMemo(() => computeStats(inScope(sets, "owned")).totalSpent, [sets]);
  const [bump, setBump] = useState(0);
  if (!ready) return <span className="skeleton h-9 w-28" />;
  return (
    <Link
      href="/value"
      className="group relative hidden items-center gap-2 rounded-xl border-[2.5px] border-ink bg-paper px-3 py-1.5 sm:flex lg:hidden 2xl:flex"
      aria-label={`Total spent on sets in your vault: ${formatINR(spent)}. Open the value tracker`}
    >
      <span className="mono-meta leading-none text-ink/60">Spent</span>
      <CountUp value={spent} format={compactINR} memoryKey="nav-spent" className="font-display text-lg font-extrabold leading-none" onRise={() => setBump((b) => b + 1)} />
      <AnimatePresence>
        {bump > 0 && (
          <motion.span
            key={bump}
            className="pointer-events-none absolute -right-3 -top-4"
            initial={{ scale: 0, rotate: -30, opacity: 1 }}
            animate={{ scale: [0, 1.2, 1], rotate: 0, opacity: [1, 1, 0] }}
            transition={{ duration: 1.4, times: [0, 0.3, 1] }}
          >
            <Starburst className="h-10 w-10" points={9}>
              <span className="text-[0.6rem] font-extrabold">+</span>
            </Starburst>
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

function TopBar({ ready }: { ready: boolean }) {
  const path = usePathname();
  const setPalette = useUI((s) => s.setPalette);
  const openAdd = useUI((s) => s.openAdd);

  return (
    <div className="sticky top-0 z-40 px-3 pt-3 sm:px-6 lg:px-8">
      <nav aria-label="Main" className="panel mx-auto flex max-w-[1400px] items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-3">
        <Link href="/" className="shrink-0 rounded-lg px-1" aria-label="BRICKVAULT home">
          <Logo className="glitch" />
        </Link>
        <ul className="ml-2 hidden items-center gap-1 lg:flex">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(path, href);
            return (
              <li key={href} className="relative">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="group relative flex items-center gap-1.5 rounded-lg px-2 py-2 font-display xl:px-3 text-[0.92rem] font-extrabold uppercase tracking-wide"
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-0 rounded-lg border-[2.5px] border-ink bg-yellow shadow-comic-sm"
                      style={{ rotate: -2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    />
                  )}
                  <Icon size={17} strokeWidth={2.6} className="relative transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-110" aria-hidden />
                  <span className="sr-only xl:not-sr-only">
                    <span className="relative">{label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <SpendTicker ready={ready} />
          <button type="button" onClick={() => setPalette(true)} className="btn btn-sm gap-2 bg-paper px-2.5 md:px-3" aria-label="Search and commands (Ctrl+K)">
            <Search size={17} strokeWidth={2.8} />
            <span className="hidden normal-case tracking-normal md:inline lg:hidden 2xl:inline">Search</span>
            <kbd className="hidden rounded border-2 border-ink px-1 font-mono text-[0.65rem] md:inline lg:hidden 2xl:inline">Ctrl K</kbd>
          </button>
          <button type="button" onClick={() => openAdd()} className="btn btn-red btn-sm hidden sm:inline-flex" disabled={!ready} aria-label="Add set">
            <Plus size={18} strokeWidth={3} />
            <span className="lg:hidden 2xl:inline">Add set</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function MobileNav() {
  const path = usePathname();
  const openAdd = useUI((s) => s.openAdd);
  const [more, setMore] = useState(false);
  const main = NAV.slice(0, 3);
  const extra = NAV.slice(3);
  const extraActive = extra.some((n) => isActive(path, n.href));

  useEffect(() => setMore(false), [path]);

  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),12px)] lg:hidden">
      <AnimatePresence>
        {more && (
          <motion.ul
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="panel mb-3 ml-auto grid w-56 gap-1 p-2"
          >
            {extra.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(path, href) ? "page" : undefined}
                  className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 font-display font-extrabold uppercase", isActive(path, href) && "bg-yellow")}
                >
                  <Icon size={18} strokeWidth={2.6} aria-hidden /> {label}
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      <ul className="panel grid grid-cols-5 items-end px-1.5 py-1.5">
        {main.slice(0, 2).map((n) => (
          <MobileItem key={n.href} {...n} active={isActive(path, n.href)} />
        ))}
        <li className="flex justify-center">
          <button
            type="button"
            onClick={() => openAdd()}
            className="-mt-7 grid h-16 w-16 place-items-center rounded-full border-[3px] border-ink bg-red shadow-comic transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none"
            aria-label="Add a set"
          >
            <Plus size={30} strokeWidth={3.2} />
          </button>
        </li>
        <MobileItem {...main[2]} active={isActive(path, main[2].href)} />
        <li>
          <button
            type="button"
            onClick={() => setMore((m) => !m)}
            aria-expanded={more}
            className={cn("flex w-full flex-col items-center gap-0.5 rounded-lg py-1.5 font-display text-[0.68rem] font-extrabold uppercase", (more || extraActive) && "bg-yellow")}
          >
            <Ellipsis size={22} strokeWidth={2.6} aria-hidden />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}

function MobileItem({ href, label, Icon, active }: { href: string; label: string; Icon: (typeof NAV)[number]["Icon"]; active: boolean }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn("flex flex-col items-center gap-0.5 rounded-lg py-1.5 font-display text-[0.68rem] font-extrabold uppercase", active && "bg-yellow")}
      >
        <Icon size={22} strokeWidth={2.6} aria-hidden />
        {label}
      </Link>
    </li>
  );
}

function DemoBanner() {
  const hasDemo = useVault((s) => s.sets.some((x) => x.demo) || s.wishlist.some((w) => w.demo));
  const clearDemo = useVault((s) => s.clearDemo);
  if (!hasDemo) return null;
  return (
    <div className="mx-auto mt-3 max-w-[1400px] px-3 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border-[2.5px] border-dashed border-ink bg-pink/60 px-4 py-2 text-sm">
        <span className="mono-meta rounded border-2 border-ink bg-paper px-1.5 py-0.5">Demo data</span>
        <span className="font-medium">You are looking at sample sets, not your own collection. Prices are illustrative.</span>
        <button type="button" className="btn btn-sm ml-auto bg-paper" onClick={clearDemo}>
          Remove demo data
        </button>
      </div>
    </div>
  );
}
