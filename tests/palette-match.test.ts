import { describe, expect, it } from "vitest";
import { normalize, rank, tier } from "../src/ts/palette-match.js";

// 面板里真实的那几条，顺序与模板一致。
const LABELS = [
  "Toggle light and dark",
  "Copy link to this page",
  "Print this page",
  "Edit this page",
  "Open the repository",
  "Open this page in ChatGPT",
  "Search this site…",
];

describe("tier", () => {
  it("ranks a whole-label prefix above a word prefix above a substring", () => {
    expect(tier("Print this page", "pri")).toBe(3);
    expect(tier("Print this page", "this")).toBe(2);
    expect(tier("Print this page", "rin")).toBe(1);
    expect(tier("Print this page", "zzz")).toBe(0);
  });

  it("treats an empty query as a full match so the list stays whole", () => {
    expect(tier("anything", "")).toBe(3);
    expect(tier("anything", "   ")).toBe(3);
  });

  it("normalizes case and full-width characters", () => {
    expect(tier("Print this page", "PRINT")).toBe(3);
    // Ｐ 是全角，NFKC 之后与 P 同一个。
    expect(tier("Print this page", "Ｐｒｉ")).toBe(3);
  });
});

describe("rank", () => {
  it("keeps only matches and puts the strongest tier first", () => {
    // "page" 是三条的词首命中（Copy link to this **page**、Print this **page**、
    // Edit this **page**）加一条位置命中（Open this **page** in ChatGPT 也是词首）。
    const order = rank(LABELS, "page");
    expect(order.length).toBeGreaterThan(0);
    for (const i of order) expect(LABELS[i]?.toLowerCase()).toContain("page");
  });

  it("preserves template order inside a tier", () => {
    // "open" 从开头命中两条，它们在模板里的先后必须保住 —— 那个顺序按常用
    // 程度排过，重排一次读者的肌肉记忆就没了。
    expect(rank(LABELS, "open")).toEqual([4, 5]);
  });

  it("drops everything when nothing matches", () => {
    expect(rank(LABELS, "qqq")).toEqual([]);
  });

  it("returns every index for an empty query, in order", () => {
    expect(rank(LABELS, "")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe("normalize", () => {
  it("collapses runs of whitespace", () => {
    expect(normalize("  a   b  ")).toBe("a b");
  });
});
