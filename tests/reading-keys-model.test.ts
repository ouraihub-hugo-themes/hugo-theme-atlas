import { describe, expect, it } from "vitest";
import { currentIndex, nextIndex } from "../src/ts/reading-keys-model.js";

// 阅读线：与 scroll-padding-top 同一个值。
const LINE = 66;

describe("currentIndex", () => {
  it("picks the last heading that crossed the reading line", () => {
    // 三个标题：两个在线上方（已读过），一个在下方。
    expect(currentIndex([-400, 20, 900], LINE)).toBe(1);
  });

  it("returns -1 above the first heading", () => {
    expect(currentIndex([300, 900], LINE)).toBe(-1);
  });

  it("counts a heading parked exactly at the line as reached", () => {
    // 跳转的落点就是这个值。算作"没到"的话，再按 j 会跳回同一节。
    expect(currentIndex([LINE], LINE)).toBe(0);
  });

  it("tolerates the sub-pixel overshoot a real jump leaves behind", () => {
    // 实测值：scrollIntoView 之后 rect.top 是 66.0625，阅读线 66，DPR 1。
    // 这一条就是那个回归 —— 没有余量的话它返回 -1，`j` 会跳回同一节。
    expect(currentIndex([66.0625], 66)).toBe(0);
    expect(currentIndex([LINE + 7.9], LINE)).toBe(0);
    // 超过容差就是真的还没到。
    expect(currentIndex([LINE + 40], LINE)).toBe(-1);
  });
});

describe("nextIndex", () => {
  it("advances and retreats one heading", () => {
    const tops = [-400, 20, 900];
    expect(nextIndex(tops, LINE, 1, null)).toBe(2);
    // 当前是 1，且它就在线附近（20 距 66 只有 46，未超过回节首阈值 40 吗——
    // 46 > 40，所以这里先回节首）。见下一条专门测这个分界。
    expect(nextIndex(tops, LINE, -1, null)).toBe(1);
  });

  it("re-anchors to the current section before leaving it", () => {
    // 标题在阅读线上方 100px：读进去了，k 先回本节节首。
    expect(nextIndex([LINE - 100, 900], LINE, -1, null)).toBe(0);
    // 就在节首附近（差 10px，未过阈值）：k 去上一节，这里没有上一节所以不动。
    expect(nextIndex([LINE - 10, 900], LINE, -1, null)).toBe(-1);
  });

  it("dwells at both ends instead of wrapping", () => {
    // 已在最后一节按 j。
    expect(nextIndex([-900, -400], LINE, 1, null)).toBe(-1);
    // 第一节之前按 k。
    expect(nextIndex([300, 900], LINE, -1, null)).toBe(-1);
  });

  it("counts from the cursor while a scroll is still in flight", () => {
    // rect 全是旧值（都说"还没到"），但游标记着刚跳到 0。没有游标的话这里会
    // 算成 -1 + 1 = 0，也就是原地不动 —— 按住 j 卡住的那个症状。
    const stale = [300, 900, 1500];
    expect(nextIndex(stale, LINE, 1, 0)).toBe(1);
    expect(nextIndex(stale, LINE, 1, 1)).toBe(2);
  });

  it("dwells at the ends when following the cursor too", () => {
    expect(nextIndex([0, 0, 0], LINE, 1, 2)).toBe(-1);
    expect(nextIndex([0, 0, 0], LINE, -1, 0)).toBe(-1);
  });

  it("does nothing without headings", () => {
    expect(nextIndex([], LINE, 1, null)).toBe(-1);
    expect(nextIndex([], LINE, -1, 3)).toBe(-1);
  });
});
