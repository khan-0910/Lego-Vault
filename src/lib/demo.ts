import { formatINR } from "./money";
import { findStarter } from "./themes";
import type { Condition, LegoSet, SetEvent, Theme, WishItem } from "./types";
import { todayISO } from "./utils";

/*
 * Optional sample collection, only loaded when the user asks for it.
 * Every record carries demo: true so "Remove demo data" can take it out cleanly.
 * Prices are illustrative INR figures, not market data.
 */

type Row = [
  setNumber: string,
  name: string,
  theme: string,
  pieces: number,
  price: number | null,
  monthsAgo: number,
  seller: string,
  condition: Condition,
  estimate: number | null,
  notes?: string,
];

const ROWS: Row[] = [
  ["21336", "The Office", "Ideas", 1164, 11999, 32, "Amazon.in", "built", 15000, "Sold once the display shelf got full."],
  ["42115", "Lamborghini Sián FKP 37", "Technic", 3696, 34999, 30, "Amazon.in", "built", 52000, "Retired. Keep the box flat-packed in the loft."],
  ["71799", "NINJAGO City Markets", "Ninjago", 6163, 34999, 28, "Second-hand (OLX)", "incomplete", 28000, "Missing two minifigure accessories."],
  ["42143", "Ferrari Daytona SP3", "Technic", 3778, 39999, 26, "LEGO Certified Store, Bengaluru", "sealed", 46500],
  ["21058", "Great Pyramid of Giza", "Architecture", 1476, 12999, 22, "Toycra", "built", 16500],
  ["10305", "Lion Knights' Castle", "Icons", 4514, 34999, 20, "LEGO Certified Store, Mumbai", "built", 38000],
  ["75331", "The Razor Crest", "Star Wars", 6187, 54999, 18, "LEGO Certified Store, Bengaluru", "sealed", 62000],
  ["10281", "Bonsai Tree", "Botanicals", 878, 4499, 16, "Amazon.in", "built", 4000],
  ["42141", "McLaren Formula 1 Race Car", "Technic", 1432, 17999, 14, "Hamleys", "built", 15500],
  ["76269", "Avengers Tower", "Marvel", 5201, 44999, 12, "LEGO Certified Store, Delhi", "built", 41000],
  ["60337", "Express Passenger Train", "City", 764, 11999, 11, "Hamleys", "used", 9000],
  ["10497", "Galaxy Explorer", "Icons", 1254, 9999, 9, "Toycra", "built", 9500],
  ["76419", "Hogwarts Castle and Grounds", "Harry Potter", 2660, 15999, 7, "Flipkart", "sealed", 17000],
  ["31139", "Cozy House", "Creator 3-in-1", 808, null, 6, "Birthday gift", "built", 5500],
  ["10311", "Orchid", "Botanicals", 608, 4499, 5, "Flipkart", "sealed", null],
  ["75375", "Millennium Falcon", "Star Wars", 921, 8999, 3, "Amazon.in", "opened", 8500],
  ["42171", "Mercedes-AMG F1 W14 E Performance", "Technic", 1642, 19999, 2, "Amazon.in", "sealed", 20000],
  ["76916", "Porsche 963", "Speed Champions", 280, 2199, 1, "Toycra", "sealed", null],
];

function monthsBack(n: number, day: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return todayISO(d);
}

export function buildDemo(): { sets: LegoSet[]; themes: Theme[]; wishlist: WishItem[] } {
  const themes = new Map<string, Theme>();
  const themeId = (name: string) => {
    let t = themes.get(name);
    if (!t) {
      const s = findStarter(name)!;
      t = { id: `demo_th_${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: s.name, color: s.color, pattern: s.pattern, icon: s.icon, createdAt: new Date().toISOString(), demo: true };
      themes.set(name, t);
    }
    return t.id;
  };

  const sets = ROWS.map((r, i): LegoSet => {
    const [setNumber, name, theme, pieces, price, monthsAgo, seller, condition, estimate, notes = ""] = r;
    const bought = monthsBack(monthsAgo, 4 + ((i * 7) % 22));
    const added = `${bought}T19:30:00.000Z`;
    const p = price == null ? null : price * 100;
    const v = estimate == null ? null : estimate * 100;
    const history: SetEvent[] = [
      { id: `demo_ev_${i}_a`, type: "added", at: added, label: "Added to the vault" },
      {
        id: `demo_ev_${i}_p`,
        type: "purchased",
        at: bought,
        label: p != null ? `Bought from ${seller} for ${formatINR(p)}` : `Received: ${seller}`,
        to: p,
      },
    ];
    if (v != null) {
      const revalued = monthsAgo > 6;
      history.push({
        id: `demo_ev_${i}_v`,
        type: "value",
        at: revalued ? `${monthsBack(Math.max(1, Math.floor(monthsAgo / 3)), 12)}T10:00:00.000Z` : added,
        label: revalued ? "Value estimate updated" : "First value estimate",
        from: revalued ? p : null,
        to: v,
      });
    }
    const sold = setNumber === "21336";
    const saleDate = monthsBack(2, 18);
    if (sold) history.push({ id: `demo_ev_${i}_s`, type: "sold", at: `${saleDate}T12:00:00.000Z`, label: `Sold for ${formatINR(1450000)}`, to: 1450000 });
    return {
      id: `demo_set_${setNumber}`,
      name,
      setNumber,
      themeId: themeId(theme),
      pieces,
      purchasePrice: p,
      purchaseDate: bought,
      seller,
      condition,
      marketValue: v,
      marketValueAt: v != null ? history[history.length - (sold ? 2 : 1)].at : null,
      notes,
      photoIds: [],
      status: sold ? "sold" : "owned",
      salePrice: sold ? 1450000 : null,
      saleDate: sold ? saleDate : null,
      history,
      createdAt: added,
      updatedAt: added,
      demo: true,
    };
  }).reverse();

  const wish = (id: string, setNumber: string, name: string, theme: string, price: number, priority: 1 | 2 | 3, notes = ""): WishItem => ({
    id: `demo_wish_${id}`,
    name,
    setNumber,
    themeId: themeId(theme),
    targetPrice: price * 100,
    priority,
    link: "",
    notes,
    createdAt: new Date().toISOString(),
    demo: true,
  });

  const wishlist = [
    wish("rivendell", "10316", "The Lord of the Rings: Rivendell", "Icons", 54999, 3, "Wait for a festive sale."),
    wish("notre", "21061", "Notre-Dame de Paris", "Architecture", 27999, 2),
    wish("p1", "42172", "McLaren P1", "Technic", 49999, 2),
  ];

  return { sets, themes: [...themes.values()], wishlist };
}
