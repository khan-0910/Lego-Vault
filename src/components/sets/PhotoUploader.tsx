"use client";

import { ImagePlus, Star, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type DragEvent, useId, useRef, useState } from "react";
import { usePhotoURL } from "@/lib/hooks";
import { ACCEPTED_TYPES, prepareImage, putPhoto, validateImage } from "@/lib/photos";
import { cn } from "@/lib/utils";

export async function storeFiles(files: File[]): Promise<{ ids: string[]; errors: string[] }> {
  const ids: string[] = [];
  const errors: string[] = [];
  for (const f of files) {
    const problem = validateImage(f);
    if (problem) {
      errors.push(problem);
      continue;
    }
    try {
      ids.push(await putPhoto(await prepareImage(f)));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `${f.name}: could not save`);
    }
  }
  return { ids, errors };
}

export function PhotoThumb({ id, alt, className }: { id: string; alt: string; className?: string }) {
  const url = usePhotoURL(id);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- local blob URL
    <img src={url} alt={alt} className={cn("h-full w-full object-cover", className)} />
  ) : (
    <div className={cn("skeleton h-full w-full rounded-none", className)} />
  );
}

export function DropZone({ onFiles, busy, compact }: { onFiles: (files: File[]) => void; busy?: boolean; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const id = useId();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    onFiles([...e.dataTransfer.files]);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-xl border-[3px] border-dashed border-ink text-center transition-colors",
        compact ? "px-4 py-5" : "px-6 py-9",
        over ? "bg-yellow" : "bg-cream",
      )}
    >
      <motion.span animate={over ? { rotate: [0, -10, 10, 0], scale: 1.15 } : { rotate: 0, scale: 1 }} className="grid h-12 w-12 place-items-center rounded-xl border-[3px] border-ink bg-paper shadow-comic-sm">
        <ImagePlus size={24} strokeWidth={2.6} aria-hidden />
      </motion.span>
      <p className="font-display text-lg font-extrabold">{busy ? "Saving photos…" : "Drop photos here"}</p>
      <p className="text-sm text-ink/70">JPG, PNG, WebP, GIF or AVIF · up to 15 MB each · big photos are resized</p>
      <label htmlFor={id} className="btn btn-sm btn-yellow mt-1">
        Choose files
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Upload + preview grid used inside the add/edit form. First photo is the cover. */
export function PhotoUploader({ photoIds, onChange, name }: { photoIds: string[]; onChange: (ids: string[]) => void; name: string }) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const add = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    const res = await storeFiles(files);
    setBusy(false);
    setErrors(res.errors);
    if (res.ids.length) onChange([...photoIds, ...res.ids]);
  };

  return (
    <div className="space-y-4">
      <DropZone onFiles={add} busy={busy} />
      {errors.length > 0 && (
        <ul className="space-y-1 rounded-lg border-2 border-ink bg-pink px-3 py-2 text-sm font-semibold" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {photoIds.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <AnimatePresence>
            {photoIds.map((id, i) => (
              <motion.li
                key={id}
                layout
                initial={{ opacity: 0, scale: 0.8, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: i % 2 ? 1.5 : -1.5 }}
                exit={{ opacity: 0, scale: 0.7 }}
                className="relative aspect-square overflow-hidden rounded-xl border-[3px] border-ink shadow-comic-sm"
              >
                <PhotoThumb id={id} alt={`${name || "Set"} photo ${i + 1}`} />
                {i === 0 ? (
                  <span className="mono-meta absolute bottom-1 left-1 rounded border-2 border-ink bg-yellow px-1 text-[0.6rem]">Cover</span>
                ) : (
                  <button
                    type="button"
                    className="absolute bottom-1 left-1 grid h-7 w-7 place-items-center rounded-md border-2 border-ink bg-paper"
                    onClick={() => onChange([id, ...photoIds.filter((p) => p !== id)])}
                    aria-label={`Make photo ${i + 1} the cover`}
                  >
                    <Star size={14} strokeWidth={2.8} />
                  </button>
                )}
                <button
                  type="button"
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md border-2 border-ink bg-paper"
                  onClick={() => onChange(photoIds.filter((p) => p !== id))}
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
