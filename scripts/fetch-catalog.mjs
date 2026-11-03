// Builds the LEGO set catalog and homepage news into public/catalog.
//   sets.json        every set Rebrickable knows, 1949 to announced-but-unreleased
//   highlights.json  small file for the homepage: upcoming, just announced, facts, news
//   minifigs.json    every minifigure, with the sets it comes in
//   seen.json        when each new set first showed up, carried over from the live site
// Runs before every Pages build, and the workflow runs nightly, so new sets appear on their own.
import { mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const OUT = "public/catalog";
const REBRICKABLE = "https://cdn.rebrickable.com/media/downloads";
const NEWS_FEED = "https://brickset.com/feed/";
const PREV = (process.env.CATALOG_PREV_URL ?? "https://khan-0910.github.io/Lego-Vault/catalog").replace(/\/$/, "");
const UA = { "user-agent": "BRICKVAULT catalog builder (+https://github.com/khan-0910/Lego-Vault)" };

/** Root themes that are not buildable sets: keychains, books, spare parts. Mirrored in src/lib/catalog.ts. */
const EXTRAS = new Set(["Gear", "Books", "Service Packs", "Bulk Bricks", "Other"]);

const today = new Date().toISOString().slice(0, 10);
const thisYear = Number(today.slice(0, 4));

async function get(url, as = "text") {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return as === "buffer" ? Buffer.from(await res.arrayBuffer()) : as === "json" ? res.json() : res.text();
}

const tryGet = (url, as) => get(url, as).catch((e) => (console.warn(`  skipped: ${e.message}`), null));

/** RFC 4180 CSV: quoted fields may hold commas and doubled quotes. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(field), (field = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  return rows.filter((r) => r.length > 1);
}

const csv = async (name) => parseCSV(gunzipSync(await get(`${REBRICKABLE}/${name}.csv.gz`, "buffer")).toString("utf8")).slice(1);

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

/** Headline, link and date only. Brickset does not allow its article text to be republished. */
function parseNews(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item]) => {
      const tag = (t) => decode(item.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1] ?? "");
      const date = new Date(tag("pubDate"));
      return { title: tag("title"), link: tag("link"), date: Number.isNaN(+date) ? null : date.toISOString() };
    })
    .filter((n) => n.title && /^https:\/\/brickset\.com\//.test(n.link))
    .slice(0, 12);
}

const fmt = (n) => n.toLocaleString("en-IN");

function buildFacts(sets, rootName) {
  const real = sets.filter((s) => s[4] >= 10 && s[2] <= thisYear);
  const facts = [];
  const biggest = real.reduce((a, b) => (b[4] > a[4] ? b : a));
  facts.push({ text: `The biggest set in the catalog is ${biggest[1]} with ${fmt(biggest[4])} pieces.`, q: biggest[0] });

  const firstYear = Math.min(...real.map((s) => s[2]));
  const first = real.filter((s) => s[2] === firstYear).sort((a, b) => b[4] - a[4])[0];
  facts.push({ text: `The oldest sets in here are from ${firstYear}, like ${first[1]}. That is ${thisYear - firstYear} years of bricks.`, q: first[0] });

  const perYear = new Map();
  for (const s of real) perYear.set(s[2], (perYear.get(s[2]) ?? 0) + 1);
  const [busiest, busiestCount] = [...perYear].reduce((a, b) => (b[1] > a[1] ? b : a));
  facts.push({ text: `${busiest} was the busiest year so far, with ${fmt(busiestCount)} sets.` });

  for (const ago of [10, 20, 25, 30, 40, 50, 60, 70, 75]) {
    const yr = thisYear - ago;
    const those = real.filter((s) => s[2] === yr);
    if (those.length < 3) continue;
    const top = those.reduce((a, b) => (b[4] > a[4] ? b : a));
    facts.push({ text: `${ago} years ago, in ${yr}, LEGO put out ${fmt(those.length)} sets. The biggest was ${top[1]} with ${fmt(top[4])} pieces.`, q: top[0] });
  }

  const avg = (yr) => {
    const xs = real.filter((s) => s[2] === yr);
    return xs.length ? Math.round(xs.reduce((t, s) => t + s[4], 0) / xs.length) : null;
  };
  const then = avg(thisYear - 30);
  const now = avg(thisYear - 1);
  if (then && now) facts.push({ text: `An average set in ${thisYear - 30} had ${fmt(then)} pieces. Last year it was ${fmt(now)}.` });

  const perTheme = new Map();
  for (const s of real) perTheme.set(rootName(s[3]), (perTheme.get(rootName(s[3])) ?? 0) + 1);
  const [bigTheme, bigThemeCount] = [...perTheme].reduce((a, b) => (b[1] > a[1] ? b : a));
  facts.push({ text: `${bigTheme} has more sets than any other theme: ${fmt(bigThemeCount)} and counting.` });

  const pieces = real.reduce((t, s) => t + s[4], 0);
  facts.push({ text: `Every set in the catalog adds up to ${fmt(pieces)} pieces. Building one of each would take a while.` });
  return facts;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log("Catalog: downloading Rebrickable sets and themes…");

  let catalog;
  try {
    const [setRows, themeRows] = await Promise.all([csv("sets"), csv("themes")]);
    catalog = {
      themes: themeRows.map(([id, name, parent]) => [Number(id), name, parent ? Number(parent) : null]),
      // [set number, name, year, theme id, pieces]. Images follow one URL pattern, so they are not stored.
      sets: setRows.map(([num, name, year, theme, parts]) => [num, name, Number(year), Number(theme), Number(parts)]).sort((a, b) => b[2] - a[2] || a[0].localeCompare(b[0])),
    };
  } catch (e) {
    console.warn(`Catalog: Rebrickable unavailable (${e.message}). Reusing the live copy.`);
    catalog = await tryGet(`${PREV}/sets.json`, "json");
    if (!catalog) {
      console.warn("Catalog: no live copy either. Writing an empty catalog.");
      catalog = { themes: [], sets: [] };
    }
  }

  const themeById = new Map(catalog.themes.map((t) => [t[0], t]));
  const rootName = (id) => {
    let t = themeById.get(id);
    while (t?.[2] != null && themeById.has(t[2])) t = themeById.get(t[2]);
    return t?.[1] ?? "Other";
  };

  // Minifigures, each with the sets it comes in (from the first inventory of every set).
  let figs;
  try {
    const [figRows, invRows, invFigRows] = await Promise.all([csv("minifigs"), csv("inventories"), csv("inventory_minifigs")]);
    const firstInv = new Map();
    for (const [id, version, setNum] of invRows) {
      if (setNum.startsWith("fig-")) continue;
      const prev = firstInv.get(setNum);
      if (!prev || Number(version) < prev.version) firstInv.set(setNum, { id, version: Number(version) });
    }
    const invToSet = new Map([...firstInv].map(([setNum, inv]) => [inv.id, setNum]));
    const setYear = new Map(catalog.sets.map((s) => [s[0], s]));
    const inSets = new Map();
    for (const [invId, figNum] of invFigRows) {
      const setNum = invToSet.get(invId);
      if (!setNum || !setYear.has(setNum)) continue;
      const list = inSets.get(figNum) ?? inSets.set(figNum, []).get(figNum);
      if (!list.includes(setNum)) list.push(setNum);
    }
    const themeNames = [];
    const themeIdx = new Map();
    const idx = (name) => themeIdx.get(name) ?? (themeIdx.set(name, themeNames.push(name) - 1), themeNames.length - 1);
    figs = {
      themes: themeNames,
      // [fig number, name, pieces, theme index or -1, first year or 0, sets it comes in, oldest first]
      figs: figRows
        .map(([num, name, parts]) => {
          const sets = (inSets.get(num) ?? []).sort((a, b) => setYear.get(a)[2] - setYear.get(b)[2] || a.localeCompare(b));
          const first = sets.length ? setYear.get(sets[0]) : null;
          return [num, name, Number(parts), first ? idx(rootName(first[3])) : -1, first ? first[2] : 0, sets];
        })
        .sort((a, b) => b[4] - a[4] || a[0].localeCompare(b[0])),
    };
  } catch (e) {
    console.warn(`Minifigs: Rebrickable unavailable (${e.message}). Reusing the live copy.`);
    figs = (await tryGet(`${PREV}/minifigs.json`, "json")) ?? { themes: [], figs: [] };
  }

  // First-seen dates: anything not in last night's catalog is newly announced today.
  const [prevSets, prevSeen] = await Promise.all([tryGet(`${PREV}/sets.json`, "json"), tryGet(`${PREV}/seen.json`, "json")]);
  const seen = { since: prevSeen?.since ?? today, added: { ...(prevSeen?.added ?? {}) } };
  if (prevSets?.sets?.length) {
    const before = new Set(prevSets.sets.map((s) => s[0]));
    for (const s of catalog.sets) if (!before.has(s[0]) && !seen.added[s[0]]) seen.added[s[0]] = today;
  }
  const cutoff = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
  for (const [num, at] of Object.entries(seen.added)) if (at < cutoff) delete seen.added[num];

  const xml = await tryGet(NEWS_FEED);
  const news = xml ? parseNews(xml) : ((await tryGet(`${PREV}/highlights.json`, "json"))?.news ?? []);

  const isSet = (s) => !EXTRAS.has(rootName(s[3]));
  const card = (s) => ({ num: s[0], name: s[1], year: s[2], theme: rootName(s[3]), pieces: s[4] });
  const bySize = (a, b) => b[4] - a[4] || a[1].localeCompare(b[1]);
  const byNum = new Map(catalog.sets.map((s) => [s[0], s]));
  const upcoming = catalog.sets.filter((s) => s[2] > thisYear && isSet(s));
  const highlights = {
    updatedAt: new Date().toISOString(),
    count: catalog.sets.length,
    thisYear,
    thisYearCount: catalog.sets.filter((s) => s[2] === thisYear && isSet(s)).length,
    upcomingCount: upcoming.length,
    upcoming: upcoming.sort(bySize).slice(0, 24).map(card),
    fresh: Object.entries(seen.added)
      .filter(([num]) => byNum.has(num) && isSet(byNum.get(num)))
      .sort((a, b) => b[1].localeCompare(a[1]))
      .slice(0, 24)
      .map(([num, at]) => ({ ...card(byNum.get(num)), seen: at })),
    newest: catalog.sets.filter((s) => s[2] === thisYear && s[4] >= 50 && isSet(s)).sort(bySize).slice(0, 24).map(card),
    facts: catalog.sets.length ? buildFacts(catalog.sets.filter(isSet), rootName) : [],
    news,
  };

  writeFileSync(`${OUT}/sets.json`, JSON.stringify(catalog));
  writeFileSync(`${OUT}/minifigs.json`, JSON.stringify(figs));
  writeFileSync(`${OUT}/seen.json`, JSON.stringify(seen));
  writeFileSync(`${OUT}/highlights.json`, JSON.stringify(highlights));
  console.log(`Catalog: ${fmt(catalog.sets.length)} sets, ${fmt(figs.figs.length)} minifigs, ${highlights.upcomingCount} upcoming, ${highlights.fresh.length} just announced, ${news.length} headlines.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
