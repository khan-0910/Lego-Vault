"use client";

import { Cloud, Download, FileBraces, FileSpreadsheet, HardDrive, Sparkles, TriangleAlert, Upload } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { Field, Segmented } from "@/components/ui/Fields";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { PageHeader, Panel } from "@/components/ui/Panel";
import { CSV_COLUMNS, type CSVImport, csvToSets, download, setsToCSV } from "@/lib/csv";
import { buildDemo } from "@/lib/demo";
import { useThemes } from "@/lib/hooks";
import { formatINR } from "@/lib/money";
import { blobToDataURL, getPhoto, listPhotoIds } from "@/lib/photos";
import { type Backup, backupSchema } from "@/lib/schema";
import { useVault } from "@/lib/store";
import type { Prefs, Theme } from "@/lib/types";
import { toast } from "@/lib/ui";
import { nowISO, pluralise, todayISO, uid } from "@/lib/utils";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function SettingsPage() {
  const sets = useVault((s) => s.sets);
  const themes = useVault((s) => s.themes);
  const wishlist = useVault((s) => s.wishlist);
  const motionPref = useVault((s) => s.prefs.motion);
  const setPrefs = useVault((s) => s.setPrefs);
  const loadDemo = useVault((s) => s.loadDemo);
  const clearDemo = useVault((s) => s.clearDemo);
  const { byId } = useThemes();
  const [photoCount, setPhotoCount] = useState<number | null>(null);
  const [withPhotos, setWithPhotos] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<Backup | null>(null);
  const [pendingCSV, setPendingCSV] = useState<CSVImport | null>(null);
  const [erasing, setErasing] = useState(false);
  const hasDemo = sets.some((s) => s.demo) || wishlist.some((w) => w.demo);

  useEffect(() => {
    listPhotoIds()
      .then((ids) => setPhotoCount(ids.length))
      .catch(() => setPhotoCount(null));
  }, [sets]);

  const exportJSON = async () => {
    setBusy(true);
    try {
      const st = useVault.getState();
      let photos: Record<string, string> | undefined;
      if (withPhotos) {
        photos = {};
        for (const id of st.sets.flatMap((s) => s.photoIds)) {
          const blob = await getPhoto(id);
          if (blob) photos[id] = await blobToDataURL(blob);
        }
      }
      const backup: Backup = { app: "brickvault", version: 1, exportedAt: nowISO(), sets: st.sets, themes: st.themes, wishlist: st.wishlist, ...(photos ? { photos } : {}) };
      download(`brickvault-backup-${todayISO()}.json`, JSON.stringify(backup), "application/json");
      toast({ kind: "success", title: "Backup downloaded", body: `${pluralise(st.sets.length, "set")}${photos ? `, ${pluralise(Object.keys(photos).length, "photo")}` : ""}.` });
    } catch {
      toast({ kind: "error", title: "Backup failed", body: "Could not read your photos. Try again without photos." });
    } finally {
      setBusy(false);
    }
  };

  const readBackup = async (file: File) => {
    try {
      const parsed = backupSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        const issues = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "file"}: ${i.message}`);
        toast({ kind: "error", title: "Not a BRICKVAULT backup", body: issues.join(" · ") });
        return;
      }
      setPendingBackup(repairThemes(parsed.data));
    } catch {
      toast({ kind: "error", title: "Could not read that file", body: "It does not look like valid JSON." });
    }
  };

  const readCSV = async (file: File) => {
    try {
      setPendingCSV(csvToSets(await file.text()));
    } catch {
      toast({ kind: "error", title: "Could not read that file" });
    }
  };

  return (
    <div>
      <PageHeader kicker="Data" title="Backup & tools" accent="#62D2FF"
        build="tower"
        fig={{ torso: "#7BF1C8", legs: "#4062FF", print: "brick", hat: "helmet", hatColor: "#FF5C6C", mood: "determined" }} subtitle="Your collection lives in this browser. Export it often, move it between devices with a backup file, or bring in a spreadsheet." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel label="Where your data lives" labelTone="#7BF1C8" labelIcon={<HardDrive size={14} strokeWidth={3} aria-hidden />}>
          <p className="leading-relaxed">
            <strong>Local mode.</strong> Sets, themes and wishlist are saved in this browser&apos;s storage, photos in its IndexedDB. Nothing is sent anywhere. Clearing site data or switching browsers starts empty, so keep a backup.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Sets", sets.length],
              ["Themes", themes.length],
              ["Wishes", wishlist.length],
              ["Photos", photoCount ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border-2 border-ink bg-cream px-3 py-2">
                <dt className="mono-meta text-[0.62rem] text-ink/60">{k}</dt>
                <dd className="font-display text-2xl font-extrabold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex items-start gap-3 rounded-xl border-2 border-dashed border-ink bg-paper p-3 text-sm">
            <Cloud size={20} strokeWidth={2.6} className="mt-0.5 shrink-0" aria-hidden />
            <p>
              <strong>Cloud sync:</strong> {supabaseConfigured ? "Supabase keys are set, but this build still saves locally. Sync is the next phase." : "not set up."} The database schema with row-level security is ready in <code className="font-mono">supabase/schema.sql</code>; see the README for the setup steps.
            </p>
          </div>
        </Panel>

        <Panel label="Export" labelTone="#FFD447" labelIcon={<Download size={14} strokeWidth={3} aria-hidden />}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-cream p-3">
              <div>
                <p className="flex items-center gap-2 font-display font-extrabold">
                  <FileBraces size={18} strokeWidth={2.6} aria-hidden /> Full backup (.json)
                </p>
                <p className="text-sm text-ink/70">Everything, ready to restore here or on another device</p>
                <label className="mt-2 flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} className="h-4 w-4 accent-[#2A1F45]" />
                  Include photos (bigger file)
                </label>
              </div>
              <button type="button" className="btn btn-yellow btn-sm" onClick={exportJSON} disabled={busy || sets.length + themes.length + wishlist.length === 0}>
                {busy ? "Packing…" : "Download"}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-cream p-3">
              <div>
                <p className="flex items-center gap-2 font-display font-extrabold">
                  <FileSpreadsheet size={18} strokeWidth={2.6} aria-hidden /> Spreadsheet (.csv)
                </p>
                <p className="text-sm text-ink/70">All sets with prices in rupees. Opens in Excel or Sheets.</p>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => download(`brickvault-sets-${todayISO()}.csv`, setsToCSV(sets, byId), "text/csv;charset=utf-8")} disabled={!sets.length}>
                Download
              </button>
            </div>
          </div>
        </Panel>

        <Panel label="Import" labelTone="#FF9FD0" labelIcon={<Upload size={14} strokeWidth={3} aria-hidden />}>
          <div className="space-y-4">
            <FilePick label="Restore a backup" hint="A .json file exported from BRICKVAULT" accept="application/json,.json" onFile={readBackup} />
            <FilePick
              label="Import sets from CSV"
              hint={
                <>
                  Columns: <code className="font-mono text-[0.72rem]">{CSV_COLUMNS.slice(0, 9).join(", ")}</code>. Only <code className="font-mono">name</code> is required. Prices in rupees.
                </>
              }
              accept=".csv,text/csv"
              onFile={readCSV}
            />
          </div>
        </Panel>

        <Panel label="Demo & preferences" labelTone="#62D2FF" labelIcon={<Sparkles size={14} strokeWidth={3} aria-hidden />}>
          <div className="space-y-5">
            <div>
              <p className="font-semibold">Demo collection</p>
              <p className="text-sm text-ink/70">18 sample sets, a wishlist and themes with illustrative INR prices. Marked as demo and removable in one click.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    loadDemo(buildDemo());
                    toast({ kind: "info", title: "Demo data loaded", body: "Look for the demo banner at the top." });
                  }}
                >
                  Load demo
                </button>
                <button type="button" className="btn btn-sm" disabled={!hasDemo} onClick={() => clearDemo()}>
                  Remove demo
                </button>
              </div>
            </div>
            <div>
              <p className="mb-2 font-semibold">Motion</p>
              <Segmented<Prefs["motion"]>
                label="Motion"
                value={motionPref}
                onChange={(motion) => setPrefs({ motion })}
                options={[
                  { value: "system", label: "Follow device" },
                  { value: "reduced", label: "Reduced" },
                  { value: "full", label: "Full" },
                ]}
              />
            </div>
            <div>
              <p className="font-semibold">Currency</p>
              <p className="text-sm text-ink/70">Indian Rupee (₹, en-IN grouping like ₹1,25,000). More currencies can be added later.</p>
            </div>
          </div>
        </Panel>

        <section className="panel border-red-deep p-5 lg:col-span-2" aria-labelledby="danger-title">
          <h2 id="danger-title" className="flex items-center gap-2 font-display text-xl font-extrabold uppercase text-red-deep">
            <TriangleAlert size={20} strokeWidth={2.8} aria-hidden /> Danger zone
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-ink/80">Erase every set, theme, wishlist item and photo from this browser. Download a backup first if you might want them back.</p>
            <button type="button" className="btn btn-red" onClick={() => setErasing(true)}>
              Erase everything
            </button>
          </div>
        </section>
      </div>

      <BackupDialog backup={pendingBackup} onClose={() => setPendingBackup(null)} />
      <CSVDialog result={pendingCSV} onClose={() => setPendingCSV(null)} />
      <EraseDialog open={erasing} onClose={() => setErasing(false)} />
    </div>
  );
}

/** Older or hand-edited backups can point sets at missing themes; park those in "Imported". */
function repairThemes(b: Backup): Backup {
  const ids = new Set(b.themes.map((t) => t.id));
  const orphans = b.sets.some((s) => !ids.has(s.themeId));
  if (!orphans) return b;
  const imported: Theme = { id: uid("th"), name: "Imported", color: "#EFE4F5", pattern: "dots", icon: "blocks", createdAt: nowISO() };
  return {
    ...b,
    themes: [...b.themes, imported],
    sets: b.sets.map((s) => (ids.has(s.themeId) ? s : { ...s, themeId: imported.id })),
    wishlist: b.wishlist.map((w) => (w.themeId && !ids.has(w.themeId) ? { ...w, themeId: null } : w)),
  };
}

function FilePick({ label, hint, accept, onFile }: { label: string; hint: ReactNode; accept: string; onFile: (f: File) => void }) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-cream p-3">
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-display font-extrabold">{label}</p>
        <p className="text-sm text-ink/70">{hint}</p>
      </div>
      <label htmlFor={id} className="btn btn-sm">
        Choose file
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function BackupDialog({ backup, onClose }: { backup: Backup | null; onClose: () => void }) {
  const importBackup = useVault((s) => s.importBackup);
  const hasData = useVault((s) => s.sets.length + s.themes.length + s.wishlist.length > 0);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const run = async (mode: "merge" | "replace") => {
    if (!backup) return;
    try {
      await importBackup(backup, mode);
      toast({ kind: "success", title: mode === "replace" ? "Backup restored" : "Backup merged", body: `${pluralise(backup.sets.length, "set")} from ${new Date(backup.exportedAt).toLocaleDateString("en-IN")}.` });
    } catch {
      toast({ kind: "error", title: "Import failed", body: "Photos could not be stored. Free up space and try again." });
    }
    onClose();
  };
  return (
    <>
      <Modal open={backup != null && !confirmReplace} onClose={onClose} title="Restore backup" eyebrow="Import" tone="#FF9FD0" size="sm">
        {backup && (
          <div className="space-y-4 p-5">
            <p>
              Found <strong>{pluralise(backup.sets.length, "set")}</strong>, {pluralise(backup.themes.length, "theme")}, {pluralise(backup.wishlist.length, "wishlist item")}
              {backup.photos ? ` and ${pluralise(Object.keys(backup.photos).length, "photo")}` : ""}.
            </p>
            <p className="text-sm text-ink/70">
              <strong>Merge</strong> adds anything you don&apos;t already have. <strong>Replace</strong> swaps your current vault for the backup.
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              {hasData && (
                <button type="button" className="btn btn-yellow" onClick={() => run("merge")} data-autofocus>
                  Merge
                </button>
              )}
              <button type="button" className="btn btn-red" onClick={() => (hasData ? setConfirmReplace(true) : run("replace"))}>
                {hasData ? "Replace" : "Restore"}
              </button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmReplace}
        onClose={() => setConfirmReplace(false)}
        onConfirm={() => run("replace")}
        title="Replace your vault?"
        body="Your current sets, themes and wishlist will be swapped for the backup. Photos not in the backup are cleaned up next time the app starts."
        confirmLabel="Replace"
      />
    </>
  );
}

function CSVDialog({ result, onClose }: { result: CSVImport | null; onClose: () => void }) {
  const importSets = useVault((s) => s.importSets);
  const total = result ? result.rows.reduce((s, r) => s + (r.purchasePrice ?? 0), 0) : 0;
  return (
    <Modal open={result != null} onClose={onClose} title="Import from CSV" eyebrow="Import" tone="#FF9FD0" size="md">
      {result && (
        <div className="space-y-4 p-5">
          <p>
            <strong>{pluralise(result.rows.length, "set")}</strong> ready to add
            {result.rows.length > 0 && <>, worth {formatINR(total)} in purchases</>}.
          </p>
          {result.errors.length > 0 && (
            <div className="rounded-xl border-2 border-ink bg-pink p-3">
              <p className="font-semibold">{pluralise(result.errors.length, "row")} skipped:</p>
              <ul className="scroll-comic mt-1 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm">
                {result.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-red"
              disabled={!result.rows.length}
              data-autofocus
              onClick={() => {
                const n = importSets(result.rows);
                toast({ kind: "cash", title: `Imported ${pluralise(n, "set")}`, body: "Totals updated. New themes were created where needed." });
                onClose();
              }}
            >
              Add {pluralise(result.rows.length, "set")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function EraseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const eraseAll = useVault((s) => s.eraseAll);
  return (
    <Modal open={open} onClose={onClose} title="Erase everything?" eyebrow="Danger zone" tone="#FF5C6C" size="sm">
      <form
        className="space-y-4 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (text !== "ERASE") return;
          await eraseAll();
          try {
            localStorage.removeItem("brickvault:draft");
          } catch {
            /* nothing to clear */
          }
          setText("");
          toast({ kind: "info", title: "Vault erased", body: "Fresh start." });
          onClose();
        }}
      >
        <p>This cannot be undone. Type <strong className="font-mono">ERASE</strong> to confirm.</p>
        <Field label="Confirmation">
          {({ id }) => <input id={id} data-autofocus className="input font-mono" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />}
        </Field>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-red" disabled={text !== "ERASE"}>
            Erase
          </button>
        </div>
      </form>
    </Modal>
  );
}
