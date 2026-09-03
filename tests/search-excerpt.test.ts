import { describe, expect, it } from "vitest";
import { stripToMarks, type MarkStrippable } from "../src/ts/search.js";

/**
 * 手写替身，不装 jsdom。
 *
 * 被测的是「哪些元素拆掉、活下来的清成什么样」这一层遍历，不是 HTML 解析 ——
 * `<template>` 的解析与惰性（脚本不跑、资源不请求）是规范保证的，不是本仓库的
 * 逻辑，为它装一个解析器测不到额外的东西。所以这里的输入是已经解析好的树，
 * 形状照着上游 excerpt 实测过的那六种写。
 *
 * 与 `markmap.test.ts` 那份替身同一个路子（见那份的头注释）。
 */
/**
 * 文本节点。**必须建模成节点而不是元素的一个字段** —— 拆元素靠
 * `replaceWith(...childNodes)`，文本要能作为子节点被交回父级；把它存成字段的话
 * 拆掉元素就连文本一起丢了，而真实 DOM 会留下。第一版替身就是这么错的，两条断言
 * 挂在这上面。
 */
class Text {
  data: string;

  // 不写成参数属性：`erasableSyntaxOnly` 禁掉了那个语法。
  constructor(data: string) {
    this.data = data;
  }

  get html(): string {
    return this.data;
  }
}

type Node = El | Text;

class El implements MarkStrippable {
  tagName: string;
  children: Node[] = [];
  parent: El | null = null;
  attrs = new Map<string, string>();

  constructor(tagName: string, text = "", children: Node[] = []) {
    this.tagName = tagName.toUpperCase();
    const kids: Node[] = text ? [new Text(text), ...children] : children;
    for (const c of kids) {
      if (c instanceof El) c.parent = this;
      this.children.push(c);
    }
  }

  attr(name: string, value: string): this {
    this.attrs.set(name, value);
    return this;
  }

  get childNodes(): Node[] {
    return this.children;
  }

  getAttributeNames(): string[] {
    return [...this.attrs.keys()];
  }

  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }

  /** 拆掉自己，把传进来的节点放回原位。 */
  replaceWith(...nodes: unknown[]): void {
    const p = this.parent;
    if (!p) throw new Error("replaceWith on a root node");
    const at = p.children.indexOf(this);
    const kids = nodes as Node[];
    for (const k of kids) if (k instanceof El) k.parent = p;
    p.children.splice(at, 1, ...kids);
    this.parent = null;
  }

  /** 只印标签与留下来的属性，用来断言「属性没了」。 */
  get html(): string {
    const t = this.tagName.toLowerCase();
    const a = [...this.attrs].map(([k, v]) => ` ${k}="${v}"`).join("");
    return `<${t}${a}>${this.children.map((c) => c.html).join("")}</${t}>`;
  }

  /** 文档序的全部后代元素，即 `querySelectorAll("*")` 那份快照。文本节点不在内。 */
  descendants(): El[] {
    return this.children.flatMap((c) => (c instanceof El ? [c, ...c.descendants()] : []));
  }
}

/** 建一棵树、清洗、返回根的 html。快照要在清洗前取 —— querySelectorAll 也是快照。 */
function clean(root: El): string {
  stripToMarks(root.descendants());
  return root.html;
}

const root = (...children: El[]) => new El("div", "", children);
const el = (tag: string, text = "", ...children: El[]) => new El(tag, text, children);

describe("stripToMarks", () => {
  it("拆掉非-mark 元素，属性随元素消失", () => {
    // <img src=x onerror=…>boom  ->  boom
    const tree = root(el("img").attr("src", "x").attr("onerror", "alert(1)"), el("span", "boom"));
    expect(clean(tree)).toBe("<div>boom</div>");
  });

  it("script 变成可见文字，不再是元素", () => {
    // 浏览器里实测到的就是这个：脚本源码变成可见文字，紧跟后面的正文。
    // 不执行是 template 惰性文档保证的，这里断言的是「拆成文本而不是整段丢弃」——
    // 一个高亮词恰好落在这段里时，丢弃会让读者看到断句。
    const tree = root(el("script", "alert(1)"), el("span", "ok"));
    expect(clean(tree)).toBe("<div>alert(1)ok</div>");
  });

  it("拆掉外层的同时保住里面的 mark", () => {
    // <svg onload=…><mark>m</mark></svg>  ->  <mark>m</mark>
    const tree = root(el("svg", "", el("mark", "m")).attr("onload", "alert(1)"));
    expect(clean(tree)).toBe("<div><mark>m</mark></div>");
  });

  it("嵌套多层里的 mark 一样存活", () => {
    const tree = root(el("div", "", el("span", "", el("mark", "deep"))));
    expect(clean(tree)).toBe("<div><mark>deep</mark></div>");
  });

  it("mark 自己带的属性也要剥掉", () => {
    // 这一条是修之前会失败的：mark 活下来时属性是原样保留的，实测过
    // onmouseover / onclick 真的会触发。
    const tree = root(
      el("mark", "x").attr("onmouseover", "alert(1)").attr("onclick", "alert(2)"),
    );
    expect(clean(tree)).toBe("<div><mark>x</mark></div>");
  });

  it("多个属性一次剥净，不隔一个漏一个", () => {
    // 用 getAttributeNames() 而不是遍历实时的 attributes 集合，就是为了这条。
    const m = el("mark", "y");
    for (const n of ["a", "b", "c", "d", "e"]) m.attr(n, "1");
    expect(clean(root(m))).toBe("<div><mark>y</mark></div>");
    expect(m.getAttributeNames()).toEqual([]);
  });

  it("干净的 excerpt 原样通过", () => {
    const tree = root(el("mark", "hit"));
    expect(clean(tree)).toBe("<div><mark>hit</mark></div>");
  });

  it("空输入不炸", () => {
    expect(() => stripToMarks([])).not.toThrow();
  });
});
