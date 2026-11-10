"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Comic-panel dialog: traps focus, closes on Escape / backdrop, gives focus back
 * to whatever opened it.
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  className,
  size = "md",
  tone = "#FFD447",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const el = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      el?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "panel relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-b-[16px]",
              size === "sm" && "sm:max-w-md",
              size === "md" && "sm:max-w-xl",
              size === "lg" && "sm:max-w-3xl",
              className,
            )}
            initial={{ opacity: 0, y: 60, rotate: -2, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, rotate: 1.5, scale: 0.96, transition: { duration: 0.16 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          >
            <header className="relative flex items-start justify-between gap-4 border-b-[3px] border-ink px-5 pb-4 pt-5" style={{ background: tone }}>
              <div className="halftone-fade pointer-events-none absolute inset-0" aria-hidden />
              <div className="relative min-w-0">
                {eyebrow && <p className="mono-meta mb-1 opacity-80">{eyebrow}</p>}
                <h2 id={titleId} className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.7rem]">
                  {title}
                </h2>
              </div>
              <button type="button" onClick={onClose} className="btn btn-sm btn-icon relative shrink-0 bg-paper" aria-label="Close">
                <X size={18} strokeWidth={3} />
              </button>
            </header>
            <div className="scroll-comic min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Small yes/no dialog for destructive actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Delete",
  tone = "#FF5C6C",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  tone?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" tone={tone} eyebrow="Hold up">
      <div className="space-y-5 p-5">
        <div className="text-[0.98rem] leading-relaxed">{body}</div>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="btn" onClick={onClose} data-autofocus>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-red"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
