# BRICKVAULT

**Every brick has a story. Every set has a value.**

A LEGO collection manager and spending tracker with a comic-book look: thick ink outlines, halftone print, misregistered type, starbursts and cartoon motion. Log each set with what you paid and what you think it is worth; BRICKVAULT adds it all up by theme, month and set.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first run, add a set or press **Try demo data** to explore with 18 sample sets.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run catalog` | Download the LEGO set catalog and news into `public/catalog/` (run once before `dev`) |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests for money parsing, totals, filters, charts and CSV |
| `npm run build:pages` | Fresh catalog, then static export to `out/` for GitHub Pages (served from `/Lego-Vault/`) |

Live site: https://khan-0910.github.io/Lego-Vault/ . Every push to `main` and a nightly run at 08:00 IST rebuild it through `.github/workflows/pages.yml`, which publishes `out/` to the `gh-pages` branch. Set pages use `/set?id=…` because set ids live in your browser, not on a server.

## What's in it

- **HQ** – giant animated total-spent counter, estimated value with a gain/loss dial, sets, pieces, average per set, price per piece, record holders, "Hot off the press" (Brickset headlines, a daily LEGO fact, upcoming and just-announced sets) and "Your universe": one card per theme.
- **Catalog** – every LEGO set from 1949 to announced-but-unreleased (about 28,500) with pictures. Search by name or number, filter by theme, year (tap the timeline) or coming soon, then add a set to the vault or wishlist in one click. A **Minifigures** tab does the same for all ~17,000 LEGO minifigures, with the sets each one comes in.
- **Minifigures in the vault** – the add form can add a set or a minifigure. Typing a name suggests matches from the catalog; picking one fills in the number, theme and pieces. When a set has minifigures, you can tick any to add them too, at no extra cost. The Vault filters by type, and totals say "3 sets and 2 minifigs". Typing a set number still offers to fill in the rest.
- **Value tracker** – filter by status, theme, condition and purchase date. Total spent, estimated value, unrealised gain/loss and return; spending-by-theme donut and bars (click to see the sets behind them); monthly spending as brick columns (per month or running total, 12M/24M/all, click a month); leaderboard by paid, worth or gain; purchase timeline; realised profit on sold sets.
- **Vault** – grid or list, search by name or set number (`10305` finds `10305-1`), filters for theme, condition, date and price, eight sort orders, choose what cards show, export the current view to CSV.
- **Set dossier** – photo gallery, money panel, update value, mark sold / undo sale, delete with undo, and tabs for overview, history (every price, value and condition change), photos and a value-over-time chart.
- **Add / edit** – four steps (set, deal, value, photos). Name and theme are the only required fields; **Save now** works from any step. Prices accept `34999`, `35k`, `1.2L`, `1,25,000`. New-set drafts autosave.
- **Wishlist** – target price, priority, link, notes. **Got it!** moves an item into the vault with the details filled in. Wishlist prices never count as spending.
- **Themes** – type any theme when adding a set; common LEGO themes are suggestions only. Restyle (colour, print pattern, icon), merge duplicates, delete with reassignment.
- **Data** – JSON backup (optionally with photos), restore (merge or replace), CSV export, CSV import with per-row errors, demo data on/off, motion preference, erase everything.
- **Everywhere** – `Ctrl/Cmd + K` command palette, `N` to add a set, toasts with undo, mobile bottom bar, reduced-motion support.

### How the money works

- Amounts are stored as integer **paise** (₹1 = 100) and shown in INR with Indian grouping: ₹1,25,000.
- **Spent** = sum of purchase prices. **Estimated value** = sum of *your* estimates. They are never mixed.
- **Gain/loss and return** only use sets that have both a price and an estimate, and the UI says how many that is. A missing estimate never shows up as a loss.
- Sold sets leave the in-vault totals but keep their history; switch the status filter to include them and see realised profit.
- Every figure is computed from the records in `src/lib/calc.ts` on each change. Nothing is hard-coded.
- Currency lives in `src/lib/money.ts`, so another currency can be added in one place.

## Where data lives (local mode)

This build runs fully in the browser with no backend:

- Sets, themes, wishlist and preferences: `localStorage` (`brickvault:vault`).
- Photos: IndexedDB, resized to 1600px before saving. Orphaned photos are cleaned up on start.

Clearing site data or switching browsers starts empty, so use **Data → Full backup** regularly.

The set catalog is public reference data, not yours: `scripts/fetch-catalog.mjs` builds it from [Rebrickable](https://rebrickable.com/downloads/)'s daily open data and Brickset's news feed (headline, date and link only; their article text may not be republished). It notes the day each new set first appears by comparing with the copy already live on Pages. If a source is down, the build reuses the live copy instead of failing.

## Supabase setup (cloud sync – next phase)

The database is designed but **sync is not wired into the app yet**; the app keeps working locally either way.

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. It creates `themes`, `sets`, `set_events`, `set_photos`, `wishlist_items` and `profiles`, money columns in paise, check constraints that match the app's validation, row-level security so each user only sees their own rows, and a private `set-photos` storage bucket scoped to `<user id>/…`.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never put the service-role key in the frontend.

To finish sync: add `@supabase/supabase-js`, Supabase Auth, and a repository that implements the actions in `src/lib/store.ts` against these tables (the JSON backup format maps one-to-one).

## Project layout

```
src/
  app/                 routes: HQ, value, collection, set (?id=), wishlist, themes, settings
  components/
    shell/             header, mobile nav, command palette
    sets/              cards, table, add/edit form, filters, photo upload
    charts/            donut, monthly bars, leaderboard, timeline, gain dial
    ui/                panels, modal, toasts, fields, theme picker, comic decor, illustrations
  lib/
    calc.ts            every derived number (tested)
    money.ts           INR parse/format (tested)
    csv.ts             CSV import/export (tested)
    store.ts           zustand store + persistence + history events
    photos.ts          IndexedDB photo storage
    demo.ts            optional sample collection
supabase/schema.sql    cloud schema with RLS
```

LEGO® is a trademark of the LEGO Group, which does not sponsor or endorse this project. Theme names are used only as labels for the user's own collection.
