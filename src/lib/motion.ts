import type { Easing } from "motion/react";

/*
 * Motion language. Two flavours, used on purpose:
 *
 * - Cartoon (default): smooth, springy, squash-and-stretch, like an old
 *   rubber-hose cartoon. Things anticipate, overshoot and settle.
 * - Stop-motion (`onTwos`): quantised into a few poses, like a brickfilm.
 *   Reserved for bricks snapping together, so it reads as a LEGO accent.
 */

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Quantised ease: `frames` visible poses between start and end. */
export function onTwos(frames = 8, overshoot = true) {
  const base = overshoot ? easeOutBack : easeOutCubic;
  return (t: number) => (t >= 1 ? 1 : Math.round(base(Math.floor(t * frames) / frames) * 1000) / 1000);
}

/** Springy entrance: overshoots and settles, smooth at any frame rate. */
export const popIn = (delay = 0, duration = 0.7) => ({ type: "spring" as const, visualDuration: duration * 0.7, bounce: 0.38, delay });

/**
 * Drop from above and land with squash and stretch: stretched while
 * falling, squashed on impact, a little rebound, then rest.
 * Pair with a bottom transform origin.
 */
export function dropLand(delay = 0, from = -90, duration = 0.8) {
  return {
    initial: { opacity: 0, y: from, scaleX: 0.86, scaleY: 1.16 },
    animate: {
      opacity: [0, 1, 1, 1, 1],
      y: [from, 0, 0, -7, 0],
      scaleX: [0.86, 0.9, 1.16, 0.97, 1],
      scaleY: [1.16, 1.12, 0.82, 1.04, 1],
    },
    transition: { duration, delay, times: [0, 0.4, 0.52, 0.74, 1], ease: ["easeIn", "easeOut", "easeOut", "easeInOut"] as Easing[] },
  };
}

/** One hop with anticipation: crouch, stretch up, land squashed, settle. */
export const hop = {
  animate: { y: [0, 4, -34, 0, -6, 0], scaleY: [1, 0.86, 1.1, 0.88, 1.03, 1], scaleX: [1, 1.1, 0.93, 1.1, 0.98, 1] },
  transition: { duration: 0.85, times: [0, 0.14, 0.42, 0.66, 0.82, 1], ease: "easeInOut" as const },
};
