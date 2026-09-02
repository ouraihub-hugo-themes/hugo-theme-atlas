import { describe, expect, it } from "vitest";
import {
  animationDuration,
  initialExpandLevel,
  treeFromHost,
  treeFromList,
} from "../src/ts/markmap.js";

/**
 * 走列表这件事只用到五个 DOM 成员：tagName、children、cloneNode、remove、
 * innerHTML。为它装一个 jsdom（含解析器与全套 DOM 实现）不值 —— 下面这个够用，
 * 而且把"innerHTML 在摘掉子列表后变短"这件被依赖的行为写明了。
 */
class El {
  children: El[] = [];
  parent: El | null = null;
  tagName: string;
  /** 本节点自己的行内内容，子列表之外的部分。 */
  own: string;

  constructor(tagName: string, own = "", children: El[] = []) {
    this.tagName = tagName;
    this.own = own;
    for (const c of children) this.append(c);
  }

  append(child: El): void {
    child.parent = this;
    this.children.push(child);
  }

  get innerHTML(): string {
    return this.own + this.children.map((c) => c.outerHTML).join("");
  }

  get outerHTML(): string {
    return `<${this.tagName.toLowerCase()}>${this.innerHTML}</${this.tagName.toLowerCase()}>`;
  }

  cloneNode(_deep: boolean): El {
    return new El(
      this.tagName,
      this.own,
      this.children.map((c) => c.cloneNode(true)),
    );
  }

  remove(): void {
    const siblings = this.parent?.children;
    if (siblings) siblings.splice(siblings.indexOf(this), 1);
    this.parent = null;
  }

  /** 只支持 "ul, ol"，运行时也只问这一个。 */
  querySelector(selector: string): El | null {
    if (selector !== "ul, ol")
      throw new Error(`fake element: unsupported selector ${selector}`);
    for (const c of this.children) {
      if (c.tagName === "UL" || c.tagName === "OL") return c;
      const found = c.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
}

const ul = (...items: El[]) => new El("UL", "", items);
const li = (own: string, ...children: El[]) => new El("LI", own, children);
/** 假元素只实现被用到的那几个成员，过边界时断言一次。 */
const asElement = (el: El) => el as unknown as Element;

describe("treeFromList", () => {
  it("走出层级，本节点内容不含子列表", () => {
    const list = ul(li("根", ul(li("枝一"), li("枝二", ul(li("叶"))))));
    expect(treeFromList(asElement(list))).toEqual([
      {
        content: "根",
        children: [
          { content: "枝一", children: [] },
          { content: "枝二", children: [{ content: "叶", children: [] }] },
        ],
      },
    ]);
  });

  it("行内标记原样带过去", () => {
    // 导图上的 `**要点**` 该是粗的 —— 取 innerHTML 而不是 textContent 就为这个。
    const list = ul(li("<strong>粗</strong> 与 <code>码</code>"));
    expect(treeFromList(asElement(list))[0]!.content).toBe(
      "<strong>粗</strong> 与 <code>码</code>",
    );
  });

  it("不改动原列表", () => {
    // 摘子列表走的是克隆。原地摘会毁掉无 JS 时页面上那份回落列表。
    const sub = ul(li("枝"));
    const list = ul(li("根", sub));
    const before = list.outerHTML;
    treeFromList(asElement(list));
    expect(list.outerHTML).toBe(before);
    expect(sub.parent).not.toBeNull();
  });

  it("跳过非 li 的子元素", () => {
    const list = new El("UL", "", [new El("SCRIPT", "x"), li("根")]);
    expect(treeFromList(asElement(list))).toEqual([
      { content: "根", children: [] },
    ]);
  });

  it("有序子列表也算层级", () => {
    const list = ul(li("根", new El("OL", "", [li("一")])));
    expect(treeFromList(asElement(list))[0]!.children).toEqual([
      { content: "一", children: [] },
    ]);
  });
});

describe("treeFromHost", () => {
  it("顶层一项时用它当根", () => {
    const host = new El("FIGURE", "", [ul(li("根", ul(li("枝"))))]);
    expect(treeFromHost(asElement(host))).toEqual({
      content: "根",
      children: [{ content: "枝", children: [] }],
    });
  });

  it("顶层多项时补一个空根", () => {
    // markmap 画一棵树。并列的顶层节点没有共同的根就各画一棵，连线断开。
    const host = new El("FIGURE", "", [ul(li("甲"), li("乙"))]);
    expect(treeFromHost(asElement(host))).toEqual({
      content: "",
      children: [
        { content: "甲", children: [] },
        { content: "乙", children: [] },
      ],
    });
  });

  it("没有列表或列表是空的时返回 null", () => {
    expect(
      treeFromHost(asElement(new El("FIGURE", "", [new El("P", "一段话")]))),
    ).toBeNull();
    expect(treeFromHost(asElement(new El("FIGURE", "", [ul()])))).toBeNull();
  });
});

describe("animationDuration", () => {
  const win = (reduce: boolean) => ({
    matchMedia: () => ({ matches: reduce }) as MediaQueryList,
  });

  it("要求减少动效时为 0", () => {
    expect(animationDuration(win(true))).toBe(0);
  });

  it("否则用默认时长", () => {
    expect(animationDuration(win(false))).toBe(500);
  });

  it("没有 matchMedia 时当作没要求", () => {
    // 默认参数是 globalThis 而不是 window：window 在 Node 里是未定义的标识符，
    // 读它直接抛 ReferenceError。这条测试在 Node 里跑，它就是那个证明。
    expect(animationDuration({})).toBe(500);
    expect(animationDuration()).toBe(500);
  });
});

describe("initialExpandLevel", () => {
  const host = (expand?: string) =>
    ({
      dataset: expand === undefined ? {} : { tdMindmapExpand: expand },
    }) as unknown as HTMLElement;

  it("读出层数", () => {
    expect(initialExpandLevel(host("2"))).toBe(2);
  });

  it("缺失与非法值都是全展开", () => {
    // -1 是 markmap 的"全展开"。0 会画出一张只有根的图，那不是作者要的。
    for (const bad of [undefined, "", "0", "-1", "2.5", "abc"]) {
      expect(initialExpandLevel(host(bad))).toBe(-1);
    }
  });
});
