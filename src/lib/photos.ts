import { uid } from "./utils";

/*
 * Photos live in IndexedDB as Blobs, keyed by id. Set records only hold the ids,
 * so localStorage stays small. Images are downscaled before they are stored.
 */

const DB_NAME = "brickvault";
const STORE = "photos";
const MAX_EDGE = 1600;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("This browser cannot store photos"));
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("Could not open photo storage"));
    };
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => resolve(req ? req.result : undefined);
        t.onerror = () => reject(t.error ?? new Error("Photo storage error"));
        t.onabort = () => reject(t.error ?? new Error("Photo storage was interrupted"));
      }),
  );
}

export async function putPhoto(blob: Blob, id = uid("ph")): Promise<string> {
  await tx("readwrite", (s) => s.put(blob, id));
  return id;
}

export const getPhoto = (id: string) => tx<Blob>("readonly", (s) => s.get(id));

export async function deletePhotos(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await tx("readwrite", (s) => {
    for (const id of ids) s.delete(id);
  });
  for (const id of ids) {
    const url = urlCache.get(id);
    if (url) URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
}

export const listPhotoIds = async () => ((await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys())) ?? []).map(String);

/** Removes photos no record points at any more (deleted sets, abandoned drafts). */
export async function gcPhotos(keep: Set<string>): Promise<number> {
  const orphans = (await listPhotoIds()).filter((id) => !keep.has(id));
  await deletePhotos(orphans);
  return orphans.length;
}

export const clearPhotos = () => tx("readwrite", (s) => s.clear());

const urlCache = new Map<string, string>();

export async function photoURL(id: string): Promise<string | null> {
  const hit = urlCache.get(id);
  if (hit) return hit;
  const blob = await getPhoto(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function validateImage(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return `${file.name}: use JPG, PNG, WebP, GIF or AVIF`;
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name}: larger than 15 MB`;
  return null;
}

/** Downscales large photos to keep storage lean. GIFs are kept as-is so they still animate. */
export async function prepareImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error(`${file.name}: could not read this image`);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`${file.name}: could not compress`))), type, 0.86),
  );
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataURLToBlob(dataURL: string): Promise<Blob> {
  return (await fetch(dataURL)).blob();
}
