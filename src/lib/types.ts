/** Money is stored as integer paise (₹1 = 100 paise) to avoid float drift. */
export type Paise = number;

export type Condition = "sealed" | "opened" | "built" | "used" | "incomplete";
export type SetStatus = "owned" | "sold";

export type SetEventType =
  | "added"
  | "purchased"
  | "value"
  | "condition"
  | "price"
  | "edited"
  | "photo"
  | "sold"
  | "restored";

export interface SetEvent {
  id: string;
  type: SetEventType;
  /** ISO datetime (or YYYY-MM-DD for purchase events). */
  at: string;
  label: string;
  from?: number | string | null;
  to?: number | string | null;
}

export interface LegoSet {
  id: string;
  name: string;
  setNumber: string;
  themeId: string;
  pieces: number | null;
  purchasePrice: Paise | null;
  /** YYYY-MM-DD */
  purchaseDate: string | null;
  seller: string;
  condition: Condition;
  /** User-entered estimate, never a verified price. */
  marketValue: Paise | null;
  marketValueAt: string | null;
  notes: string;
  photoIds: string[];
  status: SetStatus;
  salePrice: Paise | null;
  saleDate: string | null;
  history: SetEvent[];
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
}

export type PatternKey = "dots" | "stripes" | "grid" | "zigzag" | "checks" | "rays";

export type IconKey =
  | "cog"
  | "star"
  | "rocket"
  | "city"
  | "landmark"
  | "bulb"
  | "shapes"
  | "wand"
  | "zap"
  | "shield"
  | "swords"
  | "flag"
  | "heart"
  | "flower"
  | "cube"
  | "coins"
  | "castle"
  | "palette"
  | "blocks"
  | "gift"
  | "paw"
  | "puzzle"
  | "car"
  | "train"
  | "plane"
  | "anchor"
  | "ghost"
  | "bot"
  | "mountain"
  | "tree"
  | "crown"
  | "sparkles";

export interface Theme {
  id: string;
  name: string;
  color: string;
  pattern: PatternKey;
  icon: IconKey;
  createdAt: string;
  demo?: boolean;
}

export type Priority = 1 | 2 | 3;

export interface WishItem {
  id: string;
  name: string;
  setNumber: string;
  themeId: string | null;
  targetPrice: Paise | null;
  priority: Priority;
  link: string;
  notes: string;
  createdAt: string;
  demo?: boolean;
}

/** What the add/edit form hands to the store. */
export interface SetInput {
  name: string;
  setNumber: string;
  themeId: string;
  pieces: number | null;
  purchasePrice: Paise | null;
  purchaseDate: string | null;
  seller: string;
  condition: Condition;
  marketValue: Paise | null;
  notes: string;
  photoIds: string[];
}

export type WishInput = Omit<WishItem, "id" | "createdAt" | "demo">;

export type StatusScope = "owned" | "sold" | "all";

export interface SetFilters {
  q: string;
  themeIds: string[];
  conditions: Condition[];
  status: StatusScope;
  from: string | null;
  to: string | null;
  minPrice: Paise | null;
  maxPrice: Paise | null;
}

export type SortKey =
  | "recent"
  | "name"
  | "price-desc"
  | "price-asc"
  | "date-desc"
  | "date-asc"
  | "pieces-desc"
  | "pieces-asc"
  | "value-desc"
  | "value-asc"
  | "gain-desc";

export type CardField = "pieces" | "price" | "value" | "gain" | "condition" | "date";

export interface Prefs {
  view: "grid" | "list";
  sort: SortKey;
  cardFields: CardField[];
  motion: "system" | "reduced" | "full";
}
