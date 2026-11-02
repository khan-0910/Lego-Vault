import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <p className="sfx text-7xl">WHOOPS!</p>
      <h1 className="font-display text-3xl font-extrabold">This page fell behind the sofa.</h1>
      <p className="text-ink/75">Like that one 1×1 tile. It is not here.</p>
      <Link href="/" className="btn btn-yellow">Back to HQ</Link>
    </div>
  );
}
