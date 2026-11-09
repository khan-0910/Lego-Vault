"use client";

import { Children, type ReactNode } from "react";
import ScrollVelocity from "@/components/bits/ScrollVelocity";
import { Marquee } from "@/components/ui/Decor";
import { useMotionAllowed } from "@/lib/hooks";

/**
 * A ticker band that speeds up, leans and stretches with how fast you scroll,
 * like a comic speed line. Falls back to the calm marquee when motion is reduced.
 */
export function Ticker({ children, velocity = 55 }: { children: ReactNode; velocity?: number }) {
  const allowed = useMotionAllowed();
  if (!allowed) return <Marquee>{children}</Marquee>;
  return (
    <ScrollVelocity
      texts={[<span key="row" className="flex items-center gap-10 pr-10">{Children.toArray(children)}</span>]}
      velocity={velocity}
      numCopies={4}
      skewWithVelocity={10}
      scaleWithVelocity={0.06}
      damping={40}
      stiffness={300}
    />
  );
}
