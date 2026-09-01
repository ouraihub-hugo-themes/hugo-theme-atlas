import { describe, expect, it } from "vitest";
import { atDocumentBottom, pickActive } from "../src/ts/scroll-spy.js";

// pickActive 只比较 offsetOf 的返回值并读 Map 的插入序，不碰 DOM API，
// 所以用带标签的假对象加一张偏移表就能测真逻辑。
type Node = { id: string };

/**
 * 按给定顺序建 link/heading 对，偏移由 offsets 表提供。
 * 用取值函数而不是下标：noUncheckedIndexedAccess 下下标返回 T | undefined，
 * 一路撒 ! 等于把类型检查关在测试里。
 */
function fixture(offsets: Record<string, number>) {
  const ids = Object.keys(offsets);
  const links = new Map(ids.map((id) => [id, { id: `link:${id}` }]));
  const heads = new Map(ids.map((id) => [id, { id: `head:${id}` }]));
  const get = (m: Map<string, Node>, id: string): Node => {
    const v = m.get(id);
    if (!v) throw new Error(`fixture has no ${id}`);
    return v;
  };
  const byHead = new Map(ids.map((id) => [get(heads, id), offsets[id] ?? 0]));

  return {
    link: (id: string) => get(links, id),
    run: (atBottom = false) =>
      pickActive(
        ids.map((id) => [get(links, id), get(heads, id)]) as unknown as Iterable<
          [Element, HTMLElement]
        >,
        ((h: Node) => byHead.get(h) ?? 0) as unknown as (h: HTMLElement) => number,
        atBottom,
      ),
  };
}

describe("pickActive", () => {
  // 越线的标题偏移 ≤ 0，线下的 > 0。
  it("picks the last heading above the reading line", () => {
    const f = fixture({ a: -400, b: -120, c: 300, d: 700 });
    expect(f.run()).toBe(f.link("b"));
  });

  // 这条是区间模型做不到的：读者停在小节中段，上一个标题已滚出视口很远，
  // 高亮仍要留在它上面而不是闪掉。
  it("keeps the last crossed heading when the reader is mid-section", () => {
    const f = fixture({ a: -900, b: 500, c: 900 });
    expect(f.run()).toBe(f.link("a"));
  });

  // 也是区间模型做不到的：一屏内两个标题都在上三分之一时，取上面那个 ——
  // 读者读的是先越线的那节。
  it("does not jump ahead when two headings share the top of the screen", () => {
    const f = fixture({ a: -10, b: 120, c: 400 });
    expect(f.run()).toBe(f.link("a"));
  });

  it("falls back to the first heading at the top of the page", () => {
    const f = fixture({ a: 200, b: 500, c: 900 });
    expect(f.run()).toBe(f.link("a"));
  });

  it("picks the last heading once scrolled to the bottom", () => {
    const f = fixture({ a: -1200, b: -800, c: -300 });
    expect(f.run()).toBe(f.link("c"));
  });

  it("returns null when there are no headings", () => {
    expect(fixture({}).run()).toBeNull();
  });

  // 标题正好压在阅读线上时算已越线：LINE_SLACK 吸收亚像素抖动，
  // 否则锚点跳转落地会在越线/未越线之间闪。
  it("counts a heading sitting exactly on the line as crossed", () => {
    const f = fixture({ a: -500, b: 0, c: 400 });
    expect(f.run()).toBe(f.link("b"));
  });

  // 到底时越线判据失效：末屏内的标题永远滚不到阅读线，但读者明确在读末节。
  it("gives the last heading at the document bottom", () => {
    const f = fixture({ a: -900, b: 200, c: 500 });
    expect(f.run(false)).toBe(f.link("a"));
    expect(f.run(true)).toBe(f.link("c"));
  });

  it("has nothing to give at the bottom of an empty toc", () => {
    expect(fixture({}).run(true)).toBeNull();
  });
});

describe("atDocumentBottom", () => {
  it("is true once the scroll offset reaches the ceiling", () => {
    expect(atDocumentBottom(1694, 900, 2594)).toBe(true);
  });

  it("tolerates sub-pixel shortfall at the ceiling", () => {
    expect(atDocumentBottom(1692.4, 900, 2594)).toBe(true);
  });

  it("is false mid-document", () => {
    expect(atDocumentBottom(600, 900, 2594)).toBe(false);
  });

  // 这条是它单独成函数的理由：短文档 scrollTop 恒为 0 且已等于上限，
  // 不排除就会在一个整页可见的文档上高亮末节。
  it("is false when the page cannot scroll at all", () => {
    expect(atDocumentBottom(0, 900, 900)).toBe(false);
    expect(atDocumentBottom(0, 900, 640)).toBe(false);
  });
});
