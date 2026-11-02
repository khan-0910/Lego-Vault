import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

function starPoints(points: number, outer: number, inner: number, cx = 50, cy = 50) {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    out.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return out.join(" ");
}

/** Comic explosion shape. Children sit centred on top of it. */
export function Starburst({
  points = 14,
  fill = "#FFD447",
  className,
  style,
  children,
  depth = 0.72,
}: {
  points?: number;
  fill?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  depth?: number;
}) {
  const pts = starPoints(points, 47, 47 * depth);
  // Callers often pin it with `absolute`; only fall back to `relative` when they don't.
  const positioned = /\b(absolute|fixed|sticky)\b/.test(className ?? "");
  return (
    <span className={cn(!positioned && "relative", "inline-grid place-items-center", className)} style={style}>
      <svg viewBox="0 0 106 106" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <polygon points={pts} transform="translate(5 5)" fill="#2A1F45" />
        <polygon points={pts} fill={fill} stroke="#2A1F45" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      {children != null && <span className="relative px-[18%] text-center">{children}</span>}
    </span>
  );
}

export function Squiggle({ className, color = "#2A1F45" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 120 24" className={className} aria-hidden fill="none">
      <path d="M3 14c10-12 18 10 28 0s18-12 28 0 18 10 28 0 18-12 28-2" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function DoodleArrow({ className, color = "#2A1F45" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 90 60" className={className} aria-hidden fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10c22 2 48 10 60 36" />
      <path d="M52 40l15 8 3-17" />
    </svg>
  );
}

export function Sparkle({ className, color = "#FFD447" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M20 2c2 11 7 16 18 18-11 2-16 7-18 18-2-11-7-16-18-18 11-2 16-7 18-18z" fill={color} stroke="#2A1F45" strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Tiny brick studs used as a decorative row. */
export function Studs({ count = 4, color = "#FF5C6C", className }: { count?: number; color?: string; className?: string }) {
  return (
    <span className={cn("inline-flex gap-1", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="h-2.5 w-4 rounded-t-[4px] border-[2.5px] border-b-0 border-ink" style={{ background: color }} />
      ))}
    </span>
  );
}

/** Wide comic band of slanted text, e.g. a ticker of totals. */
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="flex w-max animate-marquee gap-10 pr-10">
        <div className="flex shrink-0 gap-10">{children}</div>
        <div className="flex shrink-0 gap-10" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
