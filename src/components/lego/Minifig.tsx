"use client";

import { motion } from "motion/react";
import { hop } from "@/lib/motion";
import { cn } from "@/lib/utils";

/*
 * Original little brick-figure mascot. Animations are CSS keyframes with
 * steps(), so it moves like a stop-motion puppet.
 */

const INK = "#2A1F45";
const SKIN = "#FFD447";
const S = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export type Mood = "grin" | "wow" | "smirk" | "determined";
export type Hat = "none" | "cap" | "hair" | "helmet" | "crown";

export interface MinifigProps {
  torso?: string;
  legs?: string;
  hat?: Hat;
  hatColor?: string;
  mood?: Mood;
  print?: "rupee" | "stripe" | "star" | "brick" | "none";
  wave?: boolean;
  bob?: boolean;
  /** Change this value to make the figure jump once. */
  jumpKey?: number;
  flip?: boolean;
  className?: string;
  label?: string;
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case "wow":
      return <ellipse cx="50" cy="35" rx="4" ry="5" fill={INK} />;
    case "smirk":
      return <path d="M42 34 Q51 38 58 31" fill="none" {...S} />;
    case "determined":
      return <path d="M42 35 H58" fill="none" {...S} />;
    default:
      return <path d="M40 31 Q50 42 60 31 Z" fill="#FFFAF4" {...S} />;
  }
}

function Headgear({ hat, color }: { hat: Hat; color: string }) {
  switch (hat) {
    case "cap":
      return (
        <g>
          <path d="M29 20 Q30 4 50 4 Q70 4 71 20 Z" fill={color} {...S} />
          <path d="M66 18 L86 20 Q86 24 70 23 Z" fill={color} {...S} />
        </g>
      );
    case "hair":
      return <path d="M27 24 Q24 2 50 3 Q78 2 73 26 L68 15 Q58 20 46 13 Q38 20 30 16 Z" fill={color} {...S} />;
    case "helmet":
      return (
        <g>
          <path d="M25 30 Q24 0 50 0 Q76 0 75 30 L70 30 Q70 10 50 10 Q30 10 30 30 Z" fill={color} {...S} />
          <rect x="44" y="-6" width="12" height="8" rx="2" fill={color} {...S} />
        </g>
      );
    case "crown":
      return <path d="M31 14 L33 0 L41 8 L50 -2 L59 8 L67 0 L69 14 Z" fill="#FFD447" {...S} />;
    default:
      return <rect x="41" y="3" width="18" height="8" rx="2" fill={SKIN} {...S} />;
  }
}

function TorsoPrint({ print }: { print: MinifigProps["print"] }) {
  switch (print) {
    case "rupee":
      return (
        <text x="50" y="80" textAnchor="middle" fontSize="24" fontWeight="900" fill="#FFFAF4" stroke={INK} strokeWidth="1.5" fontFamily="var(--font-dm), sans-serif">
          ₹
        </text>
      );
    case "stripe":
      return <path d="M30 66 H70" stroke="#FFFAF4" strokeWidth="6" />;
    case "star":
      return <path d="M50 58l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#FFD447" {...S} strokeWidth="2" />;
    case "brick":
      return (
        <g>
          <rect x="38" y="64" width="24" height="13" rx="2" fill="#FF5C6C" {...S} strokeWidth="2" />
          <rect x="41" y="59" width="6" height="5" rx="1" fill="#FF5C6C" {...S} strokeWidth="2" />
          <rect x="53" y="59" width="6" height="5" rx="1" fill="#FF5C6C" {...S} strokeWidth="2" />
        </g>
      );
    default:
      return null;
  }
}

export function Minifig({
  torso = "#FF5C6C",
  legs = "#4062FF",
  hat = "none",
  hatColor = "#2A1F45",
  mood = "grin",
  print = "brick",
  wave = false,
  bob = true,
  jumpKey,
  flip = false,
  className,
  label,
}: MinifigProps) {
  return (
    <motion.div
      key={jumpKey}
      className={cn("inline-block", className)}
      initial={jumpKey ? { y: 0 } : false}
      animate={jumpKey ? hop.animate : undefined}
      transition={hop.transition}
      style={{ originY: 1 }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="-4 -10 108 164" className={cn("h-full w-full overflow-visible", bob && "animate-fig-bob", flip && "-scale-x-100")}>
        {/* shadow */}
        <ellipse cx="50" cy="150" rx="34" ry="5" fill={INK} opacity=".18" />
        {/* legs */}
        <rect x="22" y="94" width="56" height="10" rx="2" fill={legs} {...S} />
        <rect x="22" y="103" width="27" height="38" rx="2" fill={legs} {...S} />
        <rect x="51" y="103" width="27" height="38" rx="2" fill={legs} {...S} />
        <rect x="20" y="136" width="30" height="9" rx="2" fill={legs} {...S} />
        <rect x="50" y="136" width="30" height="9" rx="2" fill={legs} {...S} />
        {/* left arm (static) */}
        <g>
          <path d="M28 50 L14 82 L24 87 L34 58 Z" fill={torso} {...S} />
          <path d="M11 88 a8 8 0 1 0 13 -2" fill={SKIN} {...S} />
        </g>
        {/* torso */}
        <path d="M30 48 L70 48 L79 96 L21 96 Z" fill={torso} {...S} />
        <TorsoPrint print={print} />
        {/* right arm */}
        <g className={wave ? "animate-fig-wave" : undefined} style={{ transformBox: "view-box", transformOrigin: "71px 52px" }}>
          <path d="M72 50 L86 82 L76 87 L66 58 Z" fill={torso} {...S} />
          <path d="M89 88 a8 8 0 1 1 -13 -2" fill={SKIN} {...S} />
        </g>
        {/* neck + head */}
        <rect x="43" y="42" width="14" height="7" fill={SKIN} {...S} />
        <rect x="28" y="12" width="44" height="33" rx="11" fill={SKIN} {...S} />
        <Headgear hat={hat} color={hatColor} />
        <g className="animate-fig-blink" style={{ transformBox: "view-box", transformOrigin: "50px 24px" }}>
          <ellipse cx="41" cy="24" rx="3" ry="4" fill={INK} />
          <ellipse cx="59" cy="24" rx="3" ry="4" fill={INK} />
        </g>
        <Mouth mood={mood} />
        <path d="M33 18 q2 -3 6 -3" stroke="#FFFAF4" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".8" />
      </svg>
    </motion.div>
  );
}
