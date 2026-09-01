import { describe, expect, it } from "vitest";

import { nextIndex } from "../src/ts/tabs.js";

// nextIndex 是 tabs.ts 里唯一值得单测的分支：环绕、Home/End、RTL 下方向键
// 互换，四种情况都容易写错一位。其余部分要 DOM，归浏览器验证。

describe("nextIndex", () => {
  it("方向键前后移动", () => {
    expect(nextIndex("ArrowRight", 0, 3, false)).toBe(1);
    expect(nextIndex("ArrowLeft", 1, 3, false)).toBe(0);
  });

  it("两端环绕 —— 停在端点会让人以为键盘卡住了", () => {
    expect(nextIndex("ArrowRight", 2, 3, false)).toBe(0);
    expect(nextIndex("ArrowLeft", 0, 3, false)).toBe(2);
  });

  it("RTL 下方向键互换：视觉上的下一个在左边", () => {
    expect(nextIndex("ArrowLeft", 0, 3, true)).toBe(1);
    expect(nextIndex("ArrowRight", 0, 3, true)).toBe(2);
  });

  it("Home/End 不受 RTL 影响 —— 它们指的是序列首尾，不是屏幕左右", () => {
    expect(nextIndex("Home", 2, 3, false)).toBe(0);
    expect(nextIndex("End", 0, 3, false)).toBe(2);
    expect(nextIndex("Home", 2, 3, true)).toBe(0);
    expect(nextIndex("End", 0, 3, true)).toBe(2);
  });

  it("其他键返回 null，让事件继续冒泡", () => {
    expect(nextIndex("Enter", 0, 3, false)).toBeNull();
    expect(nextIndex("ArrowDown", 0, 3, false)).toBeNull();
    expect(nextIndex("a", 0, 3, false)).toBeNull();
  });

  it("空组返回 null", () => {
    expect(nextIndex("ArrowRight", 0, 0, false)).toBeNull();
  });

  it("单个标签环绕到自己", () => {
    expect(nextIndex("ArrowRight", 0, 1, false)).toBe(0);
    expect(nextIndex("ArrowLeft", 0, 1, false)).toBe(0);
  });
});
