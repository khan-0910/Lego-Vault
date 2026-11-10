"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { type CSSProperties, Fragment, type ReactNode } from "react";
import { type BuildName, Minibuild } from "@/components/lego/Minibuild";
import { Minifig, type MinifigProps } from "@/components/lego/Minifig";
import { dropLand, popIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Row of brick studs sitting on a panel's top edge. */
export function StudRow({ count = 4, color = "#FFFAF4", className }: { count?: number; color?: string; className?: string }) {
  return (
    <span className={cn("pointer-events-none absolute -top-[13px] flex gap-2", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="h-[13px] w-7 rounded-t-[7px] border-[3px] border-b-0 border-ink"
          style={{ background: color, boxShadow: "inset 4px 3px 0 rgb(255 255 255 / .45)" }}
        />
      ))}
    </span>
  );
}

/** Content panel with an optional sticker label hanging off the top edge, and studs like a brick. */
export function Panel({
  label,
  labelTone = "#FFD447",
  labelIcon,
  action,
  className,
  bodyClassName,
  children,
  style,
  delay = 0,
  as = "section",
  studs = true,
  ...rest
}: {
  label?: string;
  labelTone?: string;
  labelIcon?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  style?: CSSProperties;
  delay?: number;
  as?: "section" | "div";
  studs?: boolean;
} & Omit<HTMLMotionProps<"section">, "children" | "style">) {
  const Comp = as === "div" ? motion.div : motion.section;
  return (
    <Comp
      initial={{ opacity: 0, y: 60, rotate: -2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={popIn(delay, 0.75)}
      className={cn("panel", (label || studs) && "mt-4", className)}
      style={style}
      {...(rest as object)}
    >
      {studs && <StudRow className="right-6" color={(style?.background as string) ?? "#FFFAF4"} />}
      {(label || action) && (
        <div className="flex items-start justify-between gap-3 px-4 pt-0 sm:px-5">
          {label ? (
            <h2 className="label-tab -mt-4" style={{ background: labelTone }}>
              {labelIcon}
              {label}
            </h2>
          ) : (
            <span />
          )}
          {action && <div className="pt-3">{action}</div>}
        </div>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </Comp>
  );
}

/** Kinetic page title: words drop in and land with a squash, misprinted like a comic, with a little LEGO scene. */
export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
  accent = "#FF5C6C",
  build,
  fig,
}: {
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  accent?: string;
  build?: BuildName;
  fig?: MinifigProps;
}) {
  const words = title.split(" ");
  return (
    <header className="relative mb-8 mt-2 flex flex-col gap-5 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="relative min-w-0">
        {kicker && (
          <motion.p
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={popIn(0.3, 0.5)}
            className="mb-3 inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink px-3 py-1 font-mono text-xs font-semibold"
            style={{ background: accent, color: "#2A1F45" }}
          >
            {kicker}
          </motion.p>
        )}
        <h1 className="font-display text-[2.3rem] uppercase leading-[0.95] sm:text-6xl lg:text-7xl">
          {words.map((w, i) => (
            // Real spaces between the animated words keep the title readable to screen readers.
            <Fragment key={`${w}-${i}`}>
              {i > 0 && " "}
              <motion.span
                className="misprint inline-block"
                {...dropLand(0.45 + i * 0.12, -80)}
                style={{ originY: 1 }}
              >
                {w}
              </motion.span>
            </Fragment>
          ))}
        </h1>
        {subtitle && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={popIn(0.6 + words.length * 0.12, 0.5)}
            className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-ink/80"
          >
            {subtitle}
          </motion.div>
        )}
      </div>
      {(actions || build || fig) && (
        <div className="flex flex-col items-start gap-4 lg:items-end">
          {(build || fig) && (
            <div className="hidden items-end gap-1 lg:flex" aria-hidden>
              {build && <Minibuild name={build} className="h-28 w-auto" delay={0.6} />}
              {fig && (
                <motion.div initial={{ y: -120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={popIn(1.4, 0.6)}>
                  <Minifig wave {...fig} className="h-28 w-[4.5rem]" />
                </motion.div>
              )}
            </div>
          )}
          {actions && (
            <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={popIn(0.7, 0.5)} className="flex flex-wrap gap-3">
              {actions}
            </motion.div>
          )}
        </div>
      )}
    </header>
  );
}
