/**
 * 思维导图运行时。
 *
 * **只用 markmap-view，不用 markmap-lib。** markmap 官方的路子是把一段 Markdown
 * 交给 markmap-lib 转成节点树，再交给 markmap-view 画。但 markmap-lib 里九成是
 * 一个 Markdown 解析器（markdown-it 加插件）：两个包一起打是 733 KB（gzip 237
 * KB），只要 view 是 77 KB（gzip 26 KB）。
 *
 * 而这里不需要那个解析器 —— Hugo 已经把作者写的嵌套列表渲染成 `<ul><li>` 了，
 * 浏览器又自带 HTML 解析。运行时从 DOM 走一遍就得到同样的树（见 treeFromList），
 * 二十行代码换掉 656 KB。
 *
 * 附带的好处：JS 没跑时页面上留下的是一个真正的嵌套列表，本身就读得通 —— 思维
 * 导图的信息全在层级里，列表把层级表达得一样清楚。
 */

import type { Markmap } from "markmap-view";

/**
 * 节点树的类型从 setData 的签名上取，不从 markmap-common 里 import。
 *
 * 那个包是 markmap-view 的传递依赖，直接 import 就得把它写进 devDependencies ——
 * 为一个类型多一条依赖声明。而这里要的正是"setData 收什么"，从它自己的签名上取
 * 到的就是那个类型，markmap 改了结构编译器照样会说。
 */
type MindmapNode = NonNullable<Parameters<Markmap["setData"]>[0]>;

type CreateFn = (typeof import("markmap-view"))["Markmap"]["create"];

let loading: Promise<CreateFn> | null = null;

async function load(): Promise<CreateFn> {
  loading ??= import("markmap-view").then((m) =>
    m.Markmap.create.bind(m.Markmap),
  );
  return loading;
}

/**
 * 把一个 `<ul>` 走成 markmap 的节点树。
 *
 * markmap 的节点是 `{ content: HTML 字符串, children: [] }`。`<li>` 里除了嵌套
 * 的 `<ul>`/`<ol>` 以外的部分就是这个节点的内容 —— 粗体、行内代码、链接都原样
 * 带过去，markmap 自己会渲染这段 HTML。
 *
 * 取 innerHTML 的克隆而不是 textContent：思维导图上的 `**要点**` 该是粗的。
 */
export function treeFromList(list: Element): MindmapNode[] {
  const nodes: MindmapNode[] = [];
  for (const li of list.children) {
    if (li.tagName !== "LI") continue;

    // 克隆后摘掉子列表，剩下的 innerHTML 就是本节点的内容。直接在原节点上删会
    // 毁掉无 JS 时的回落列表。
    const clone = li.cloneNode(true) as Element;
    const sublists = [...clone.children].filter(
      (c) => c.tagName === "UL" || c.tagName === "OL",
    );
    for (const sub of sublists) sub.remove();

    const children = [...li.children]
      .filter((c) => c.tagName === "UL" || c.tagName === "OL")
      .flatMap((sub) => treeFromList(sub));

    nodes.push({ content: clone.innerHTML.trim(), children });
  }
  return nodes;
}

/**
 * 从围栏容器里取整棵树。
 *
 * 顶层只有一项时用它当根，多项时补一个空根 —— markmap 画的是一棵树，多个并列的
 * 顶层节点没有共同的根就只能各画一棵，连线断开。空根的 content 为空串，markmap
 * 把它画成一个小圆点。
 */
export function treeFromHost(host: Element): MindmapNode | null {
  const list = host.querySelector("ul, ol");
  if (!list) return null;
  const roots = treeFromList(list);
  if (roots.length === 0) return null;
  return roots.length === 1 ? roots[0]! : { content: "", children: roots };
}

/** 读者要求减少动效吗。要求了就把展开动画的时长设为 0。 */
export function animationDuration(
  win: { matchMedia?: typeof matchMedia } = globalThis,
  fallback = 500,
): number {
  return win.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ? 0
    : fallback;
}

/** 初始展开到第几层。0 或非法值都退回 -1（全展开）。 */
export function initialExpandLevel(host: HTMLElement): number {
  const raw = host.dataset.tdMindmapExpand;
  if (!raw) return -1;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : -1;
}

const instances = new WeakMap<HTMLElement, Markmap>();

/** 画一张图。成功返回 true。 */
export async function render(host: HTMLElement): Promise<boolean> {
  const tree = treeFromHost(host);
  const svg = host.querySelector<SVGElement>("svg[data-td-mindmap-out]");
  if (!tree || !svg || instances.has(host)) return false;

  try {
    const create = await load();

    // 先挂标记，再画。fit() 按 SVG 当时的尺寸算缩放，而 CSS 在这个标记出现之前
    // 让 SVG 保持 display:none —— 顺序反了它量到 0×0，算出 scale(0)，画完的图在
    // 页面上是不可见的（而 11 个节点都在 DOM 里，看起来像画成了）。
    // 失败时下面把它摘掉，列表回到读者眼前。
    host.setAttribute("data-td-mindmap-rendered", "");

    const mm = create(svg, {
      duration: animationDuration(),
      initialExpandLevel: initialExpandLevel(host),
      // 配色跟随主题：markmap 默认按层级取一组它自带的颜色，与站点的主色无关。
      color: () => palette(),
      // embedGlobalCSS 不关。那份样式不只是配色，节点宽度是靠它量出来的 ——
      // 详见 mindmap.css 顶部。主题要改的配色与字体走它的 --markmap-* 变量。

      // 每次重画都重新取景。markmap 自带一个 ResizeObserver，容器变宽变窄时它会
      // 重画，但缩放比例是初次 fit 算出来的，不跟着动 —— 桌面宽度上算好的 1.65
      // 倍拿到 320px 的屏上，节点就溢出画布了。开了这个，重画结尾自己 fit 一次，
      // 省掉一个自己写的 observer；折叠展开后也一样跟着取景。
      autoFit: true,
    });
    await mm.setData(tree);
    instances.set(host, mm);
    return true;
  } catch (err) {
    // 不抛出去：一张画不出来的图不该让同一页其他图也画不出来。摘掉 rendered 标记，
    // 列表回到读者眼前 —— 那份嵌套列表本身就读得通。
    host.removeAttribute("data-td-mindmap-rendered");
    console.warn("markmap: mindmap failed to render", err);
    host.setAttribute("data-td-mindmap-failed", "");
    return false;
  }
}

/** 主色从 CSS 变量读，切主题时跟着变。 */
function palette(root: HTMLElement = document.documentElement): string {
  return (
    getComputedStyle(root).getPropertyValue("--color-accent").trim() ||
    "#2f6fdb"
  );
}

export function init(doc: Document = document): void {
  const hosts = [...doc.querySelectorAll<HTMLElement>("[data-td-mindmap]")];
  if (hosts.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        void render(entry.target as HTMLElement);
      }
    },
    { rootMargin: "400px" },
  );
  for (const host of hosts) observer.observe(host);
}
