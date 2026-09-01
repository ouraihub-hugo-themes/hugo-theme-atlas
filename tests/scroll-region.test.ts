import { describe, expect, it } from "vitest";

import { overflows } from "../src/ts/scroll-region.js";

// overflows 只比较四个数，不碰 DOM API —— 与 scroll-spy 一样，纯判断在这里
// 测，属性的挂与摘属于浏览器验证。

const extent = (sw: number, cw: number, sh = 200, ch = 200) => ({
  scrollWidth: sw,
  clientWidth: cw,
  scrollHeight: sh,
  clientHeight: ch,
});

describe("overflows", () => {
  it("装得下就不算溢出", () => {
    expect(overflows(extent(400, 400))).toBe(false);
  });

  it("横向超出算", () => {
    expect(overflows(extent(900, 400))).toBe(true);
  });

  it("纵向超出也算 —— matrix 是双向滚动", () => {
    expect(overflows(extent(400, 400, 900, 200))).toBe(true);
  });

  it("亚像素差不算 —— 否则每张表都会挂上 tabindex", () => {
    expect(overflows(extent(400.6, 400))).toBe(false);
    expect(overflows(extent(402, 400))).toBe(true);
  });
});
