/**
 * Mermaid 运行时。
 *
 * mermaid 是本主题最大的一个依赖 —— 入口 1.4 KB，图种按需加载，全部图种加起来
 * 3.3 MB。因此这里做两件与其他运行时不同的事：
 *
 * 1. **进视口才 import。** `IntersectionObserver` 触发动态 import，一篇文档末尾
 *    的图不会拖慢首屏。没有图的页面根本不加载这个 bundle（模板按能力标记选）。
 * 2. **源码留在 DOM 里。** 渲染成功才替换 `<pre>`。JS 没跑、import 失败、图写错
 *    了三种情况下读者看到的都是那段 mermaid 源码 —— 它是纯文本的图描述，读得懂。
 *    渲染成空白的话，读者不知道自己错过了什么。
 */

type MermaidModule = typeof import("mermaid")["default"];

let loading: Promise<MermaidModule> | null = null;

/** 当前深浅色。mermaid 的主题要跟着切，SVG 里的颜色是渲染时烧进去的。 */
export function currentTheme(root: HTMLElement = document.documentElement): "dark" | "default" {
  return root.getAttribute("data-td-theme") === "dark" ? "dark" : "default";
}

/**
 * 取图的源码。
 *
 * 从 `<pre>` 读 textContent 而不是 innerText —— 后者受 CSS 影响，会把软换行
 * 当成真换行插进去，而 mermaid 的语法是按行解析的：多一个换行就变成语法错误。
 */
export function diagramSource(host: Element): string {
  return host.querySelector("pre")?.textContent?.trim() ?? "";
}

/**
 * 首次调用时 import 并 initialize，之后复用同一个 promise。
 *
 * `securityLevel` 用默认的 `strict`，不给作者开放 —— `loose` 会放开图内 HTML
 * 标签与点击回调，那等于让任何能提交一篇文档的人在页面上执行脚本。
 */
async function load(): Promise<MermaidModule> {
  loading ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      theme: currentTheme(),
      // 字体跟随主题，否则图里是 mermaid 自带的 trebuchet 而正文是 Inter。
      fontFamily: getComputedStyle(document.body).fontFamily,
    });
    return mermaid;
  });
  return loading;
}

/**
 * 渲染一个图。成功返回 true。
 *
 * 每次渲染用新的 id：mermaid 拿 id 建临时 DOM 节点并写 `<style>`，重复的 id
 * 会让第二个图套用第一个的样式（同一页两个图，后一个的箭头颜色可能不对）。
 */
export async function render(host: HTMLElement, seq: number): Promise<boolean> {
  const source = diagramSource(host);
  if (!source) return false;

  const renderId = `td-mermaid-${seq}`;
  try {
    const mermaid = await load();
    const { svg, bindFunctions } = await mermaid.render(renderId, source);
    const figure = host.querySelector<HTMLElement>("[data-td-mermaid-out]");
    if (!figure) return false;
    figure.innerHTML = svg;
    bindFunctions?.(figure);
    host.setAttribute("data-td-mermaid-rendered", "");
    return true;
  } catch (err) {
    // 不抛出去：一个写错的图不该让同一页其他图也不渲染。源码留在页面上，
    // 作者在控制台看到是哪一个错了。
    console.warn("mermaid: diagram failed to render", err);
    host.setAttribute("data-td-mermaid-failed", "");
    // **必须自己清理。** render() 失败时 mermaid 把它的临时容器 `d<id>` 留在
    // body 上，里面是它自带的"Syntax error in text"错误图 —— 那东西会浮在页面
    // 底部，与出错的围栏离得很远，读者不知道它在说哪张图。我们已经把源码留在
    // 原地了，这一份是多余的。
    document.getElementById(`d${renderId}`)?.remove();
    return false;
  }
}

/** 深浅色切换后重渲染。SVG 的配色是渲染时定的，改 CSS 变量改不动它。 */
function watchTheme(hosts: HTMLElement[]): void {
  let theme = currentTheme();
  new MutationObserver(() => {
    const next = currentTheme();
    if (next === theme) return;
    theme = next;
    // initialize 是幂等的，重设 theme 后逐个重渲染。
    void load().then((mermaid) => {
      mermaid.initialize({ startOnLoad: false, theme: next });
      hosts.forEach((host, i) => {
        if (host.hasAttribute("data-td-mermaid-rendered")) void render(host, i);
      });
    });
  }).observe(document.documentElement, { attributeFilter: ["data-td-theme"] });
}

export function init(doc: Document = document): void {
  const hosts = [...doc.querySelectorAll<HTMLElement>("[data-td-mermaid]")];
  if (hosts.length === 0) return;

  // 提前 400px 开始加载：读者滚到图跟前时它已经画好了，不会看到源码闪一下
  // 再变成图。
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        void render(entry.target as HTMLElement, hosts.indexOf(entry.target as HTMLElement));
      }
    },
    { rootMargin: "400px" },
  );
  for (const host of hosts) observer.observe(host);

  watchTheme(hosts);
}
