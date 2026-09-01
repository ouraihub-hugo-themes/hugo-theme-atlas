import { describe, expect, it } from "vitest";

import { collapsedHeight } from "../src/ts/code.js";

// collapsedHeight 只做算术。codeText 要 DOM，归浏览器验证 —— 它真正的风险是
// "行号有没有被一起复制进去"，那只有在真实的 Chroma 输出上才有意义。

describe("collapsedHeight", () => {
  it("行高 × 行数 + 内边距", () => {
    expect(collapsedHeight(23.8, 8, 32)).toBeCloseTo(222.4);
  });

  it("内边距必须算进去 —— 否则折叠处切在半行上", () => {
    expect(collapsedHeight(20, 10, 0)).toBe(200);
    expect(collapsedHeight(20, 10, 32)).toBe(232);
  });
});
