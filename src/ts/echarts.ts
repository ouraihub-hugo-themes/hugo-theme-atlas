/**
 * 数据图表运行时。
 *
 * echarts 完整包 1.1 MB。这里按图种拆：核心加通用组件是一个 chunk，八种图各是
 * 一个 —— 一篇只有折线图的文档不下载地图和关系图的代码。
 *
 * **省下来的没有想象中多。** 实测一张折线图的页面下 543 KB（gzip 194 KB），
 * 而八种图全上是 706 KB（gzip 259 KB）—— 按图种拆只省下四分之一，剩下四分之三
 * 是核心，任何一种图都要。这与 mermaid 那边（入口 1.4 KB，图种加起来 3.3 MB）
 * 不是一个量级的收益：echarts 的图种共用坐标系、轴、刻度、动画那一整套。
 *
 * 因此这里的拆分只值得做到"一个核心 chunk + 每图种一个"，不值得再往细里切。
 * 更细的切法试过：让 esbuild 按四个 import 边界自己抽公共代码，结果是 37 个
 * 请求（34 个是几百字节到十几 KB 的碎片），字节数一样，瀑布深了一层。
 *
 * 支持的八种在下面的 `charts` 表里，它同时是"支持哪些"的唯一定义：查不到就是
 * 不支持。围栏那边（render-codeblock-echarts.html）用同一份名单在构建时 warn，
 * 因此运行时收到的图种一定在表内 —— 表外的情况只可能来自手写 HTML。
 *
 * 组件（坐标系、图例、提示框）跟着图种一起 import。共用的部分 esbuild 会自己
 * 提出去成公共 chunk，不用手工分组。
 */

import type { EChartsOption, EChartsType } from "echarts/types/dist/shared";

type Core = (typeof import("./echarts-core.js"))["echarts"];

/**
 * 图种 → 它需要的模块。直角坐标系在核心里（见 echarts-core.ts）。
 *
 * 坐标系不能漏：漏了的话 echarts 不报错，画出一张空白的图。
 */
const charts: Record<string, () => Promise<unknown>> = {
  line: () => import("echarts/lib/chart/line"),
  bar: () => import("echarts/lib/chart/bar"),
  scatter: () => import("echarts/lib/chart/scatter"),
  pie: () => import("echarts/lib/chart/pie"),
  tree: () => import("echarts/lib/chart/tree"),
  graph: () => import("echarts/lib/chart/graph"),
  // 雷达图要自己的坐标系（极坐标那一套），直角坐标系对它没用。
  radar: () =>
    Promise.all([import("echarts/lib/chart/radar"), import("echarts/lib/component/radar")]),
  // 热力图的颜色映射来自 visualMap。没有它整张图是一个颜色，而 echarts 不报错。
  heatmap: () =>
    Promise.all([import("echarts/lib/chart/heatmap"), import("echarts/lib/component/visualMap")]),
};

/** 图种列表，给测试与错误消息用。 */
export const supportedTypes = Object.keys(charts);

let core: Promise<Core> | null = null;

/**
 * 核心 + 渲染器 + 通用组件，一个 chunk。
 *
 * 一次 import 而不是四次：见 echarts-core.ts —— 分成四个 import 边界时 esbuild
 * 会把公共代码切成 34 个碎片，一张图 37 个请求。
 */
async function loadCore(): Promise<Core> {
  core ??= import("./echarts-core.js").then((m) => m.echarts);
  return core;
}

/**
 * 取出 option 里用到的图种。
 *
 * `series` 可以是一个对象也可以是数组，两种都得认 —— echarts 自己都收。
 */
export function seriesTypes(option: EChartsOption): string[] {
  const series = option.series;
  if (!series) return [];
  const list = Array.isArray(series) ? series : [series];
  const types = list
    .map((s) => (s && typeof s === "object" ? (s as { type?: unknown }).type : undefined))
    .filter((t): t is string => typeof t === "string");
  return [...new Set(types)];
}

/** 读围栏里的 option。解析失败返回 null —— 构建时已经校验过，这里是最后一道。 */
export function chartOption(host: Element): EChartsOption | null {
  const text = host.querySelector("script[type='application/json']")?.textContent;
  if (!text) return null;
  try {
    return JSON.parse(text) as EChartsOption;
  } catch {
    return null;
  }
}

/** 当前深浅色。图里的文字与轴线颜色要跟着切。 */
export function currentTheme(root: HTMLElement = document.documentElement): "dark" | "light" {
  return root.getAttribute("data-td-theme") === "dark" ? "dark" : "light";
}

/**
 * 主题色从 CSS 变量读，不在这里写死一套。
 *
 * 写死的话深浅色切换、站点改主色、forced-colors 三件事各要改一处；读变量则
 * 图表自动跟着主题走。
 */
function palette(): { text: string; axis: string; split: string } {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    text: v("--color-ink", "#16222e"),
    axis: v("--color-ink-muted", "#5b6b7c"),
    split: v("--color-border", "#d8dee6"),
  };
}

/**
 * 把主题色注册成一个 echarts 主题。
 *
 * **走 registerTheme 而不是把颜色合进 option。** echarts 的主题是"默认值"层：
 * 作者在 option 里显式写的同名字段照旧生效，没写的才取主题值。自己合并做不到
 * 这件事 —— 放在作者 option 前面（对象展开）是浅合并，作者写了
 * `xAxis: {type, data}` 就把整个 xAxis 连颜色一起顶掉，主题色根本没进去；放在
 * 后面（第二次 setOption）倒是进去了，但那是强行覆盖：作者故意设的颜色被抹掉。
 *
 * 主题里的键名与 option 里的不同：轴的默认值按坐标轴**种类**给
 * （categoryAxis / valueAxis），不是按 xAxis / yAxis。
 *
 * 轴标签、轴线、分割线各有自己的颜色字段，一个都不能漏 —— 它们不从 textStyle
 * 继承。只设 textStyle 的话切到深色后画布上除了标题全是浅色页面的颜色。
 */
function registerTheme(echarts: Core, name: string): void {
  const colors = palette();
  const axis = {
    axisLine: { lineStyle: { color: colors.split } },
    axisLabel: { color: colors.axis },
    splitLine: { lineStyle: { color: colors.split } },
  };
  echarts.registerTheme(name, {
    textStyle: { color: colors.text },
    categoryAxis: axis,
    valueAxis: axis,
    logAxis: axis,
    timeAxis: axis,
    legend: { textStyle: { color: colors.text } },
    title: { textStyle: { color: colors.text } },
  });
}

const instances = new WeakMap<HTMLElement, EChartsType>();

/** 画一个图。成功返回 true。 */
export async function render(host: HTMLElement): Promise<boolean> {
  const option = chartOption(host);
  const target = host.querySelector<HTMLElement>("[data-td-chart-out]");
  if (!option || !target) return false;

  try {
    // 查出来的 loader 一起等：过滤和取值一步做完，省掉一个 `charts[t]!`。
    const needed = seriesTypes(option)
      .map((t) => charts[t])
      .filter((load) => load !== undefined);
    const echarts = await loadCore();
    await Promise.all(needed.map((load) => load()));

    // 主题名带深浅色：主题一旦注册就不能改，切换时要换一个名字重建实例。
    const theme = `td-${currentTheme()}`;
    registerTheme(echarts, theme);

    // 深浅色切换时销毁重建，不复用实例：主题是 init 的参数，setOption 改不了它。
    const previous = instances.get(host);
    if (previous && previous.getDom().dataset.tdChartTheme !== theme) {
      previous.dispose();
      instances.delete(host);
    }
    const chart = instances.get(host) ?? echarts.init(target, theme, { renderer: "canvas" });
    target.dataset.tdChartTheme = theme;
    chart.setOption(option);
    instances.set(host, chart);
    host.setAttribute("data-td-chart-ready", "");
    return true;
  } catch (err) {
    // 不抛出去：一张画不出来的图不该让同一页其他图也画不出来。JSON 留在
    // <pre> 里，读者至少看得到数据。
    console.warn("echarts: chart failed to render", err);
    host.setAttribute("data-td-chart-failed", "");
    return false;
  }
}

/**
 * 容器变宽窄时重算尺寸。
 *
 * canvas 的像素尺寸是 init 时定的，容器变了它不会自己跟着变 —— 侧栏收起、窗口
 * 缩放、打印预览三种情况下图会被拉伸。ResizeObserver 比 window.resize 准：
 * 侧栏收起时窗口尺寸没变。
 */
function watchSize(host: HTMLElement): void {
  const target = host.querySelector<HTMLElement>("[data-td-chart-out]");
  if (!target) return;
  new ResizeObserver(() => instances.get(host)?.resize()).observe(target);
}

/** 深浅色切换后重设 option：轴线与文字颜色是 setOption 时定的。 */
function watchTheme(hosts: HTMLElement[]): void {
  let theme = currentTheme();
  new MutationObserver(() => {
    const next = currentTheme();
    if (next === theme) return;
    theme = next;
    for (const host of hosts) {
      if (host.hasAttribute("data-td-chart-ready")) void render(host);
    }
  }).observe(document.documentElement, { attributeFilter: ["data-td-theme"] });
}

export function init(doc: Document = document): void {
  const hosts = [...doc.querySelectorAll<HTMLElement>("[data-td-chart]")];
  if (hosts.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const host = entry.target as HTMLElement;
        void render(host).then((ok) => {
          if (ok) watchSize(host);
        });
      }
    },
    { rootMargin: "400px" },
  );
  for (const host of hosts) observer.observe(host);

  watchTheme(hosts);
}
