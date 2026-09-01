import { describe, expect, it } from "vitest";
import { currentTheme, diagramSource } from "../src/ts/mermaid.js";

// 两个函数都只调 getAttribute / querySelector / textContent，用假对象就能测真逻辑，
// 不用把 jsdom 拖进来。
function root(theme: string | null): HTMLElement {
  return { getAttribute: () => theme } as unknown as HTMLElement;
}

/** 一个 host，里面的 <pre> 由 text 决定；text 为 null 表示没有 <pre>。 */
function host(text: string | null): Element {
  const pre = text === null ? null : { textContent: text };
  return { querySelector: () => pre } as unknown as Element;
}

describe("currentTheme", () => {
  it("只有显式 dark 才用深色", () => {
    expect(currentTheme(root("dark"))).toBe("dark");
    expect(currentTheme(root("light"))).toBe("default");
    // 属性没设时不能猜成深色：mermaid 的配色是渲染时烧进 SVG 的，猜错了
    // 要等下一次主题切换才会重画。
    expect(currentTheme(root(null))).toBe("default");
  });
});

describe("diagramSource", () => {
  it("取出源码并去掉围栏留下的空白", () => {
    expect(diagramSource(host("\n  graph TD\n    A --> B\n  "))).toBe("graph TD\n    A --> B");
  });

  it("没有 <pre> 或只有空白时返回空串", () => {
    // render 靠这个空串短路，不然会拿空源码去调 mermaid，得到一张"语法错误"图。
    expect(diagramSource(host(null))).toBe("");
    expect(diagramSource(host("   \n  "))).toBe("");
  });
});
