import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collect, isOpen, setOpen, type DrawerParts } from "../src/ts/drawer.js";

/**
 * 手写 DOM 替身，不装 jsdom —— 与 `lazy-mount.test.ts` 同一个路子。
 *
 * 被测的不是选择器匹配（那是浏览器的事），而是 `setOpen` 的五件事必须同进同退：
 * 面板属性、关闭按钮属性、toggle 的 aria-expanded、兄弟节点的 inert、根元素的
 * 滚动锁。漏掉任何一件的反向操作，抽屉关上之后正文仍然是 inert —— 窄屏下抽屉
 * 就是主导航，那等于键盘与辅助技术用户永久失去导航，而页面看起来完全正常。
 */
class El {
  attrs = new Map<string, string>();
  inert = false;
  focused = 0;
  /** `setOpen` 与 `trap` 都用 `querySelector("a, button")` 找落焦点，给固定一个。 */
  focusable: El | null = null;

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }
  hasAttribute(name: string): boolean {
    return this.attrs.has(name);
  }
  toggleAttribute(name: string, force: boolean): void {
    if (force) this.attrs.set(name, "");
    else this.attrs.delete(name);
  }
  focus(): void {
    this.focused += 1;
  }
  querySelector(): El | null {
    return this.focusable;
  }
  contains(node: unknown): boolean {
    return node === this || node === this.focusable;
  }
}

function el(): El {
  return new El();
}

/** 一个开合前状态干净的抽屉：面板、一个 toggle、一个 closer、一个 inert 兄弟。 */
/** 只记 `td-scroll-locked` 在不在 —— `setOpen` 对根元素只做这一件事。 */
class FakeRoot {
  classes = new Set<string>();
  classList = {
    toggle: (name: string, force: boolean): void => {
      if (force) this.classes.add(name);
      else this.classes.delete(name);
    },
  };
}

let root: FakeRoot;
const realDocument = globalThis.document;

beforeEach(() => {
  root = new FakeRoot();
  // node 环境下没有 document，`setOpen` 要读 documentElement 才能上滚动锁。
  Object.defineProperty(globalThis, "document", {
    value: { documentElement: root },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "document", {
    value: realDocument,
    configurable: true,
    writable: true,
  });
});

function parts(): { p: DrawerParts; panel: El; toggle: El; closer: El; main: El; inner: El } {
  const panel = el();
  const inner = el();
  panel.focusable = inner;
  const toggle = el();
  const closer = el();
  const main = el();
  return {
    p: { panel, toggles: [toggle], closers: [closer], inert: [main] } as unknown as DrawerParts,
    panel,
    toggle,
    closer,
    main,
    inner,
  };
}

const OPEN = "data-td-shell-drawer-open";

describe("isOpen", () => {
  it("读的就是面板上那个属性，没有第二份状态", () => {
    const { p, panel } = parts();
    expect(isOpen(p.panel)).toBe(false);
    panel.attrs.set(OPEN, "");
    expect(isOpen(p.panel)).toBe(true);
  });
});

describe("setOpen 打开", () => {
  it("五件事一起发生", () => {
    const { p, panel, toggle, closer, main } = parts();
    setOpen(p, true);

    expect(panel.hasAttribute(OPEN)).toBe(true);
    expect(closer.hasAttribute(OPEN)).toBe(true);
    expect(toggle.attrs.get("aria-expanded")).toBe("true");
    expect(main.inert).toBe(true);
    expect(root.classes.has("td-scroll-locked")).toBe(true);
  });

  it("焦点进面板 —— 否则键盘用户点开抽屉后焦点还在按钮上，Tab 会走到被 inert 的正文", () => {
    const { p, inner } = parts();
    setOpen(p, true);
    expect(inner.focused).toBe(1);
  });
});

describe("setOpen 关闭", () => {
  it("五件事全部反向 —— 漏一件就是无障碍缺陷，而页面看起来正常", () => {
    const { p, panel, toggle, closer, main } = parts();
    setOpen(p, true);
    setOpen(p, false);

    expect(panel.hasAttribute(OPEN)).toBe(false);
    expect(closer.hasAttribute(OPEN)).toBe(false);
    expect(toggle.attrs.get("aria-expanded")).toBe("false");
    expect(main.inert).toBe(false);
    expect(root.classes.has("td-scroll-locked")).toBe(false);
  });

  it("焦点回到 toggle，不留在已经消失的面板里", () => {
    const { p, toggle } = parts();
    setOpen(p, true);
    setOpen(p, false);
    expect(toggle.focused).toBe(1);
  });

  it("一开始就关（视口变宽那条路径）不抛，也不留下任何痕迹", () => {
    const { p, panel, main } = parts();
    setOpen(p, false);
    expect(panel.hasAttribute(OPEN)).toBe(false);
    expect(main.inert).toBe(false);
    expect(root.classes.has("td-scroll-locked")).toBe(false);
  });

  it("反复开合状态不累积", () => {
    const { p, main } = parts();
    for (let i = 0; i < 3; i++) {
      setOpen(p, true);
      setOpen(p, false);
    }
    expect(main.inert).toBe(false);
    expect(root.classes.has("td-scroll-locked")).toBe(false);
  });
});

describe("setOpen 的多元素与空集合", () => {
  it("多个 toggle 的 aria-expanded 都跟着变 —— navbar 与侧栏各有一个", () => {
    const panel = el();
    const a = el();
    const b = el();
    const p = { panel, toggles: [a, b], closers: [], inert: [] } as unknown as DrawerParts;
    setOpen(p, true);
    expect(a.attrs.get("aria-expanded")).toBe("true");
    expect(b.attrs.get("aria-expanded")).toBe("true");
  });

  it("没有 toggle 时关闭不抛 —— toggles[0] 是可选链", () => {
    const panel = el();
    const p = { panel, toggles: [], closers: [], inert: [] } as unknown as DrawerParts;
    expect(() => setOpen(p, false)).not.toThrow();
  });

  it("面板里没有可聚焦项时打开不抛", () => {
    const panel = el();
    panel.focusable = null;
    const p = { panel, toggles: [], closers: [], inert: [] } as unknown as DrawerParts;
    expect(() => setOpen(p, true)).not.toThrow();
    expect(panel.hasAttribute(OPEN)).toBe(true);
  });
});

describe("collect", () => {
  it("没有面板就返回 null —— 宽屏专用外壳里没有抽屉，init 靠这个提前退出", () => {
    const root = { querySelector: () => null, querySelectorAll: () => [] } as unknown as ParentNode;
    expect(collect(root)).toBeNull();
  });

  it("有面板时四个字段都在，缺失的选择器给空数组而不是 undefined", () => {
    const panel = el();
    const fake = {
      querySelector: () => panel,
      querySelectorAll: () => [],
    } as unknown as ParentNode;
    const got = collect(fake);
    expect(got).not.toBeNull();
    expect(got?.panel).toBe(panel as unknown as HTMLElement);
    expect(got?.toggles).toEqual([]);
    expect(got?.closers).toEqual([]);
    expect(got?.inert).toEqual([]);
  });
});
