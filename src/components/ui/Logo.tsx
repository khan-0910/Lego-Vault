import { cn } from "@/lib/utils";

/** Side-on 2×4 brick in the comic outline style. */
export function BrickMark({ size = 40, color = "#FF5C6C", className }: { size?: number; color?: string; className?: string }) {
  const shape = (
    <>
      <rect x="9" y="3" width="11" height="8" rx="2.5" />
      <rect x="28" y="3" width="11" height="8" rx="2.5" />
      <rect x="3" y="10" width="42" height="25" rx="4.5" />
    </>
  );
  return (
    <svg viewBox="0 0 52 42" width={size} height={(size * 42) / 52} className={className} aria-hidden>
      <g fill="#2A1F45" transform="translate(4 4)">{shape}</g>
      <g fill={color} stroke="#2A1F45" strokeWidth="3" strokeLinejoin="round">
        {shape}
      </g>
      <path d="M9 16h10M9 20h5" stroke="#FFFAF4" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="37" cy="27" r="2.2" fill="#2A1F45" opacity=".25" />
    </svg>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrickMark size={compact ? 34 : 40} className="shrink-0 -rotate-6" />
      {!compact && (
        <span className="font-display text-[1.45rem] font-extrabold leading-none tracking-tight">
          <span className="misprint-sm">BRICK</span>
          <span className="ml-0.5 inline-block -rotate-3 rounded-md border-[2.5px] border-ink bg-yellow px-1 py-0.5 shadow-comic-sm">
            VAULT
          </span>
        </span>
      )}
    </span>
  );
}
