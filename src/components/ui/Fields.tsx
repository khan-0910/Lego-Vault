"use client";

import { type InputHTMLAttributes, type ReactNode, useId } from "react";
import { formatINR, parseINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  children,
  className,
  optional,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="normal-case tracking-normal opacity-55"> (optional)</span>}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-[0.8rem] leading-snug text-ink/70">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1.5 text-[0.82rem] font-semibold leading-snug text-red-deep" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Rupee input that accepts "1,25,000", "25k", "1.2L" and shows how it was read. */
export function MoneyInput({
  value,
  onChange,
  id,
  describedBy,
  invalid,
  placeholder = "0",
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
  describedBy?: string;
  invalid?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id">) {
  const parsed = parseINR(value);
  const showPreview = parsed.ok && parsed.value != null && value.replace(/[^\d]/g, "") !== String(parsed.value / 100);
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-display text-lg font-extrabold" aria-hidden>
          ₹
        </span>
        <input
          id={id}
          className="input pl-8 font-mono font-semibold tabular-nums"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
      </div>
      {showPreview && parsed.ok && (
        <p className="mono-meta mt-1.5 text-blue" aria-live="polite">
          = {formatINR(parsed.value)}
        </p>
      )}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Array<{ value: T; label: ReactNode; title?: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex flex-wrap gap-1.5", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className="chip"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
