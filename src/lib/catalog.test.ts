import { describe, expect, it } from "vitest";
import { buildCatalog, DEFAULT_QUERY, findSet, numbersIn, searchCatalog, setKey } from "./catalog";

const catalog = buildCatalog({
  themes: [
    [1, "Star Wars", null],
    [2, "Ultimate Collector Series", 1],
    [3, "Icons", null],
    [4, "Books", null],
  ],
  sets: [
    ["75192-1", "Millennium Falcon", 2017, 2, 7541],
    ["10305-1", "Lion Knights' Castle", 2022, 3, 4514],
    ["10305-2", "Lion Knights' Castle (alt box)", 2022, 3, 4514],
    ["5007-1", "Star Wars Visual Dictionary", 2019, 4, 0],
    ["99999-1", "Secret Starship", 2027, 1, 0],
  ],
});

describe("catalog", () => {
  it("rolls sub-themes up to their top-level theme", () => {
    expect(findSet(catalog, "75192")?.theme).toBe("Star Wars");
  });

  it("matches set numbers with or without the -1 variant", () => {
    expect(setKey(" 10305 - 1".replace(/ /g, ""))).toBe("10305");
    expect(findSet(catalog, "10305")?.num).toBe("10305-1");
    expect(findSet(catalog, "10305-1")?.num).toBe("10305-1");
    expect(findSet(catalog, "10305-2")?.name).toContain("alt box");
    expect(findSet(catalog, "")).toBeUndefined();
  });

  it("hides books and gear unless asked, and counts only real sets", () => {
    expect(searchCatalog(catalog.sets, DEFAULT_QUERY, 2026).map((s) => s.num)).not.toContain("5007-1");
    expect(searchCatalog(catalog.sets, { ...DEFAULT_QUERY, extras: true }, 2026).map((s) => s.num)).toContain("5007-1");
    expect(catalog.themes.map((t) => t.name)).toEqual(["Icons", "Star Wars"]);
  });

  it("filters upcoming sets and puts an exact number first", () => {
    expect(searchCatalog(catalog.sets, { ...DEFAULT_QUERY, upcoming: true }, 2026).map((s) => s.num)).toEqual(["99999-1"]);
    expect(searchCatalog(catalog.sets, { ...DEFAULT_QUERY, q: "star" }, 2026).map((s) => s.num)).toEqual(["99999-1", "75192-1"]);
    expect(searchCatalog(catalog.sets, { ...DEFAULT_QUERY, q: "10305-2", sort: "name" }, 2026)[0].num).toBe("10305-2");
  });

  it("pulls set numbers out of headlines but not years", () => {
    expect(numbersIn("Review: 75642 Showdown with Captain Smoker")).toEqual(["75642"]);
    expect(numbersIn("The best sets of 2026")).toEqual([]);
  });
});
