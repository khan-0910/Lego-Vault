import { describe, expect, it } from "vitest";
import { buildCatalog, buildFigs, DEFAULT_FIG_QUERY, DEFAULT_QUERY, findFig, findSet, numbersIn, searchCatalog, searchFigs, setKey, suggestByName } from "./catalog";

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

const figs = buildFigs({
  themes: ["Star Wars", "Icons"],
  figs: [
    ["fig-000001", "Darth Vader", 5, 0, 2017, ["75192-1", "75367-1"]],
    ["fig-000002", "Lion Knight", 4, 1, 2022, ["10305-1"]],
    ["fig-000003", "Vader's TIE Pilot", 4, 0, 2019, ["75192-1"]],
    ["fig-000004", "Mystery Promo", 3, -1, 0, []],
  ],
});

describe("minifigures", () => {
  it("maps each set to the figures that come in it", () => {
    expect(figs.bySet.get("75192")?.map((f) => f.num)).toEqual(["fig-000001", "fig-000003"]);
    expect(findFig(figs, "FIG-000002")?.theme).toBe("Icons");
    expect(figs.themes.map((t) => t.name)).toEqual(["Icons", "Star Wars"]);
  });

  it("finds figures by set number and keeps undated ones last", () => {
    expect(searchFigs(figs.figs, { ...DEFAULT_FIG_QUERY, q: "75192" }).map((f) => f.num)).toEqual(["fig-000003", "fig-000001"]);
    expect(searchFigs(figs.figs, { ...DEFAULT_FIG_QUERY, sort: "oldest" }).at(-1)?.num).toBe("fig-000004");
  });

  it("suggests names that start with what was typed first", () => {
    expect(suggestByName(figs.figs, "vader").map((f) => f.name)).toEqual(["Vader's TIE Pilot", "Darth Vader"]);
    expect(suggestByName(figs.figs, "v")).toEqual([]);
    expect(suggestByName(figs.figs, "knight lion").map((f) => f.num)).toEqual(["fig-000002"]);
  });
});
