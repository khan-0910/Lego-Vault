import type { CSSProperties } from "react";
import type { Condition, IconKey, PatternKey, Theme } from "./types";
import { normalise } from "./utils";

/** Swatches offered when a user styles a theme. Tuned to sit on the cream page. */
export const SWATCHES = [
  "#FF5C6C",
  "#FF9548",
  "#FFD447",
  "#7BF1C8",
  "#2FCB8A",
  "#4062FF",
  "#62D2FF",
  "#A77BFF",
  "#FF9FD0",
  "#D9A877",
  "#3B2F5E",
  "#EFE4F5",
] as const;

export const PATTERNS: PatternKey[] = ["dots", "stripes", "grid", "zigzag", "checks", "rays"];

export interface StarterTheme {
  name: string;
  color: string;
  pattern: PatternKey;
  icon: IconKey;
}

/** Suggestions only. Nothing is created until the user picks one. */
export const STARTER_THEMES: StarterTheme[] = [
  { name: "Technic", color: "#4062FF", pattern: "grid", icon: "cog" },
  { name: "Icons", color: "#FFD447", pattern: "rays", icon: "star" },
  { name: "Star Wars", color: "#3B2F5E", pattern: "dots", icon: "rocket" },
  { name: "City", color: "#62D2FF", pattern: "checks", icon: "city" },
  { name: "Architecture", color: "#EFE4F5", pattern: "grid", icon: "landmark" },
  { name: "Ideas", color: "#FF9FD0", pattern: "dots", icon: "bulb" },
  { name: "Creator 3-in-1", color: "#FF9548", pattern: "zigzag", icon: "shapes" },
  { name: "Harry Potter", color: "#A77BFF", pattern: "stripes", icon: "wand" },
  { name: "Marvel", color: "#FF5C6C", pattern: "rays", icon: "zap" },
  { name: "DC", color: "#2F48D6", pattern: "stripes", icon: "shield" },
  { name: "Ninjago", color: "#2FCB8A", pattern: "zigzag", icon: "swords" },
  { name: "Speed Champions", color: "#FF5A36", pattern: "checks", icon: "flag" },
  { name: "Friends", color: "#FF9FD0", pattern: "stripes", icon: "heart" },
  { name: "Botanicals", color: "#7BF1C8", pattern: "dots", icon: "flower" },
  { name: "Minecraft", color: "#6E9B3A", pattern: "checks", icon: "cube" },
  { name: "Super Mario", color: "#FF5C6C", pattern: "dots", icon: "coins" },
  { name: "Disney", color: "#9AD0F5", pattern: "rays", icon: "castle" },
  { name: "Art", color: "#FFB4A2", pattern: "stripes", icon: "palette" },
  { name: "Jurassic World", color: "#D9A877", pattern: "zigzag", icon: "paw" },
  { name: "Duplo", color: "#FFD447", pattern: "checks", icon: "blocks" },
  { name: "Classic", color: "#FF5C6C", pattern: "grid", icon: "blocks" },
  { name: "Seasonal", color: "#2FCB8A", pattern: "stripes", icon: "gift" },
];

export const ICON_KEYS: IconKey[] = [
  "blocks",
  "cog",
  "star",
  "rocket",
  "city",
  "landmark",
  "bulb",
  "shapes",
  "wand",
  "zap",
  "shield",
  "swords",
  "flag",
  "heart",
  "flower",
  "cube",
  "coins",
  "castle",
  "palette",
  "gift",
  "paw",
  "puzzle",
  "car",
  "train",
  "plane",
  "anchor",
  "ghost",
  "bot",
  "mountain",
  "tree",
  "crown",
  "sparkles",
];

export function findStarter(name: string): StarterTheme | undefined {
  const n = normalise(name);
  return STARTER_THEMES.find((t) => normalise(t.name) === n);
}

/** Deterministic style for a brand-new custom theme, so each one looks different. */
export function presetForCustom(name: string, taken: number): Pick<Theme, "color" | "pattern" | "icon"> {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const palette = SWATCHES.filter((c) => c !== "#EFE4F5" && c !== "#3B2F5E");
  return {
    color: palette[(hash + taken) % palette.length],
    pattern: PATTERNS[hash % PATTERNS.length],
    icon: "blocks",
  };
}

/** Print-style overlay for a theme surface. Layer it on top of the theme colour. */
export function patternStyle(pattern: PatternKey, onDark = false, scale = 1): CSSProperties {
  const ink = onDark ? "rgba(255,251,240,0.16)" : "rgba(25,25,35,0.14)";
  const s = (n: number) => `${n * scale}px`;
  switch (pattern) {
    case "dots":
      return {
        backgroundImage: `radial-gradient(${ink} 1.6px, transparent 2px)`,
        backgroundSize: `${s(11)} ${s(11)}`,
      };
    case "stripes":
      return {
        backgroundImage: `repeating-linear-gradient(-45deg, ${ink} 0 ${s(5)}, transparent ${s(5)} ${s(14)})`,
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(${ink} 1.5px, transparent 1.5px), linear-gradient(90deg, ${ink} 1.5px, transparent 1.5px)`,
        backgroundSize: `${s(18)} ${s(18)}`,
      };
    case "zigzag":
      return {
        backgroundImage: `linear-gradient(135deg, ${ink} 25%, transparent 25%), linear-gradient(225deg, ${ink} 25%, transparent 25%)`,
        backgroundSize: `${s(20)} ${s(20)}`,
        backgroundPosition: "0 0",
      };
    case "checks":
      return {
        backgroundImage: `conic-gradient(${ink} 25%, transparent 0 50%, ${ink} 0 75%, transparent 0)`,
        backgroundSize: `${s(18)} ${s(18)}`,
      };
    case "rays":
      return {
        backgroundImage: `repeating-conic-gradient(from 0deg at 50% 115%, ${ink} 0deg 7deg, transparent 7deg 16deg)`,
      };
  }
}

export interface ConditionMeta {
  label: string;
  short: string;
  blurb: string;
  color: string;
}

export const CONDITIONS: Record<Condition, ConditionMeta> = {
  sealed: { label: "Sealed", short: "SEALED", blurb: "Factory sealed, never opened", color: "#7BF1C8" },
  opened: { label: "Opened", short: "OPENED", blurb: "Box opened, bags may be sealed", color: "#62D2FF" },
  built: { label: "Built", short: "BUILT", blurb: "Built and displayed", color: "#FFD447" },
  used: { label: "Used", short: "USED", blurb: "Played with, signs of wear", color: "#FFB4A2" },
  incomplete: { label: "Incomplete", short: "INCOMPLETE", blurb: "Missing pieces or parts", color: "#FF5C6C" },
};

export const CONDITION_ORDER: Condition[] = ["sealed", "opened", "built", "used", "incomplete"];

export const PRIORITY_META = {
  3: { label: "Must have", short: "HIGH", color: "#FF5C6C" },
  2: { label: "Want it", short: "MED", color: "#FFD447" },
  1: { label: "Someday", short: "LOW", color: "#7BF1C8" },
} as const;
