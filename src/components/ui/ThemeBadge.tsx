import type { CSSProperties, ReactNode } from "react";
import { patternStyle } from "@/lib/themes";
import type { Condition, Theme } from "@/lib/types";
import { CONDITIONS } from "@/lib/themes";
import { cn, INK, textOn } from "@/lib/utils";
import { ThemeIcon } from "./ThemeIcon";

/** Theme colour + its print pattern, as one style object. */
export function themeSurface(theme: Theme, scale = 1): CSSProperties {
  const fg = textOn(theme.color);
  const pat = patternStyle(theme.pattern, fg !== INK, scale);
  return { backgroundColor: theme.color, color: fg, ...pat };
}

export function ThemeBadge({ theme, size = "md", className }: { theme: Theme; size?: "sm" | "md"; className?: string }) {
  const fg = textOn(theme.color);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border-[2.5px] border-ink font-bold leading-none",
        size === "sm" ? "px-2 py-1 text-[0.72rem]" : "px-2.5 py-1.5 text-[0.8rem]",
        className,
      )}
      style={{ backgroundColor: theme.color, color: fg }}
    >
      <ThemeIcon icon={theme.icon} size={size === "sm" ? 12 : 14} />
      <span className="truncate">{theme.name}</span>
    </span>
  );
}

export function ThemeDot({ theme, className }: { theme: Theme; className?: string }) {
  return (
    <span
      className={cn("inline-block h-3 w-3 shrink-0 rounded-full border-2 border-ink", className)}
      style={{ backgroundColor: theme.color }}
      aria-hidden
    />
  );
}

/** Rubber-stamp style condition marker. Text always states the condition, colour is a bonus. */
export function ConditionStamp({ condition, className, size = "md" }: { condition: Condition; className?: string; size?: "sm" | "md" | "lg" }) {
  const meta = CONDITIONS[condition];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border-[2.5px] border-ink font-mono font-extrabold uppercase leading-none tracking-wider",
        size === "sm" && "px-1.5 py-1 text-[0.62rem]",
        size === "md" && "px-2 py-1 text-[0.7rem]",
        size === "lg" && "px-3 py-1.5 text-sm",
        className,
      )}
      style={{ backgroundColor: meta.color }}
      title={meta.blurb}
    >
      {meta.short}
    </span>
  );
}

export function Pill({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 text-xs font-bold", className)} style={style}>
      {children}
    </span>
  );
}
