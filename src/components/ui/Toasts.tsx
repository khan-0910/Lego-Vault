"use client";

import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useUI } from "@/lib/ui";
import { cn } from "@/lib/utils";

const TONE = {
  cash: { bg: "#FFD447", Icon: null },
  success: { bg: "#7BF1C8", Icon: CircleCheck },
  info: { bg: "#FFFAF4", Icon: Info },
  error: { bg: "#FF9FD0", Icon: TriangleAlert },
} as const;

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-24 z-[80] flex flex-col items-center gap-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end lg:bottom-6"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = TONE[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.85, rotate: -4 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: t.kind === "cash" ? -1.5 : 0 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="pointer-events-auto relative w-full max-w-sm"
            >
              <div className="panel flex items-start gap-3 py-3 pl-4 pr-3" style={{ background: tone.bg }}>
                {t.kind === "cash" ? (
                  <span className="sfx shrink-0 pt-0.5 text-[1.35rem] text-paper" aria-hidden>
                    KA-CHING!
                  </span>
                ) : (
                  tone.Icon && <tone.Icon className="mt-0.5 shrink-0" size={22} strokeWidth={2.6} aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[1.02rem] font-extrabold leading-tight">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-sm leading-snug opacity-85">{t.body}</p>}
                  {(t.action || t.link) && (
                    <div className="mt-2 flex gap-2">
                      {t.action && (
                        <button
                          type="button"
                          className="btn btn-sm bg-paper"
                          onClick={() => {
                            t.action!.run();
                            dismiss(t.id);
                          }}
                        >
                          {t.action.label}
                        </button>
                      )}
                      {t.link && (
                        <Link href={t.link.href} className="btn btn-sm bg-paper" onClick={() => dismiss(t.id)}>
                          {t.link.label}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => dismiss(t.id)} className={cn("btn btn-ghost btn-sm btn-icon -mr-1 -mt-1 shrink-0")} aria-label="Dismiss">
                  <X size={16} strokeWidth={3} />
                </button>
              </div>
              {/* speech-bubble tail */}
              <svg className="absolute -bottom-[15px] right-10 h-4 w-6" viewBox="0 0 24 16" aria-hidden>
                <path d="M2 0 L12 14 L20 0" fill={tone.bg} stroke="#2A1F45" strokeWidth="3" strokeLinejoin="round" />
                <path d="M0 0 H24" stroke={tone.bg} strokeWidth="4" />
              </svg>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
