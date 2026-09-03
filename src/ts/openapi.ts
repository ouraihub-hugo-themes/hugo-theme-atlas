/**
 * OpenAPI 渲染器运行时（Swagger UI / Redoc）。
 *
 * **主题不打包这两个库。** swagger-ui 1.5 MB、redoc 1.1 MB，而装了主题的站点九成
 * 没有 API 文档。runtime 的地址由作者配（params.ui.openapi.*），这段代码负责取来
 * 并初始化 —— 它自己两三 KB。
 *
 * 因此这里没有类型：库不在依赖里，编译期看不到它。全局对象用最小的结构类型声明，
 * 只写实际调用到的那一个函数。
 */

import { lazyMount } from "./lazy-mount.js";

/** 已经开始加载的资源，按 URL 记。同一页两个实例只取一次。 */
const assets = new Map<string, Promise<void>>();

/**
 * 取一段外部脚本或样式表。
 *
 * integrity 有就带上，并且必须同时带 crossorigin —— 规范要求，漏了的表现是资源
 * 被浏览器直接拒绝。跨域脚本被换掉等于任意代码在读者的浏览器里执行，所以这一条
 * 不能省。
 *
 * 脚本与样式合一个函数：两者只差元素名与放 URL 的属性名，分开写是两份同样的
 * 缓存、监听与错误处理。
 */
export function loadAsset(
  url: string,
  kind: "script" | "style",
  integrity = "",
  doc: Document = document,
): Promise<void> {
  const cached = assets.get(url);
  if (cached) return cached;

  const pending = new Promise<void>((resolve, reject) => {
    let el: HTMLScriptElement | HTMLLinkElement;
    if (kind === "script") {
      el = doc.createElement("script");
      el.src = url;
    } else {
      el = doc.createElement("link");
      el.rel = "stylesheet";
      el.href = url;
    }
    if (integrity) {
      el.integrity = integrity;
      el.crossOrigin = "anonymous";
    }
    el.addEventListener("load", () => resolve());
    el.addEventListener("error", () => reject(new Error(`failed to load ${url}`)));
    doc.head.append(el);
  });
  assets.set(url, pending);
  return pending;
}

/** runtime 配置，由 foot/js.html 写进一个 JSON script。 */
export interface RuntimeConfig {
  js: string;
  css: string;
  integrity: string;
  cssIntegrity: string;
}

/**
 * 从 `<script type="application/json" data-td-openapi-config>` 读配置。
 *
 * 走 JSON 而不是一串 data 属性：URL 里可以有 `&`、`=`、逗号，塞进属性要各自转义，
 * 而这里是四个值一组、两个渲染器各一组。读不出来就返回 null，调用方留回落链接。
 */
export function readConfig(renderer: string, doc: Document = document): RuntimeConfig | null {
  const el = doc.querySelector(`script[data-td-openapi-config="${renderer}"]`);
  if (!el?.textContent) return null;
  try {
    const parsed: unknown = JSON.parse(el.textContent);
    if (typeof parsed !== "object" || parsed === null) return null;
    const c = parsed as Partial<RuntimeConfig>;
    if (!c.js) return null;
    return {
      js: c.js,
      css: c.css ?? "",
      integrity: c.integrity ?? "",
      cssIntegrity: c.cssIntegrity ?? "",
    };
  } catch {
    return null;
  }
}

type SwaggerGlobal = { SwaggerUIBundle?: (opts: Record<string, unknown>) => unknown };
type RedocGlobal = {
  Redoc?: { init: (spec: string, opts: Record<string, unknown>, el: Element) => void };
};

/** 画一个 Swagger UI 实例。 */
async function renderSwagger(host: HTMLElement, spec: string, cfg: RuntimeConfig): Promise<void> {
  const target = host.querySelector<HTMLElement>("[data-td-openapi-out]");
  if (!target) throw new Error("missing output container");

  // 样式与脚本并行取：它们互不依赖，串起来等于把两次往返叠加。
  await Promise.all([
    loadAsset(cfg.js, "script", cfg.integrity),
    cfg.css ? loadAsset(cfg.css, "style", cfg.cssIntegrity) : Promise.resolve(),
  ]);

  const bundle = (window as unknown as SwaggerGlobal).SwaggerUIBundle;
  if (!bundle) throw new Error("SwaggerUIBundle is not defined after loading the runtime");
  bundle({
    url: spec,
    domNode: target,
    // deepLinking 让操作项可以被 URL 片段直接指到，这是 API 文档最常见的分享方式。
    deepLinking: true,
  });
}

/** 画一个 Redoc 实例。 */
async function renderRedoc(host: HTMLElement, spec: string, cfg: RuntimeConfig): Promise<void> {
  const target = host.querySelector<HTMLElement>("[data-td-openapi-out]");
  if (!target) throw new Error("missing output container");

  await loadAsset(cfg.js, "script", cfg.integrity);

  const redoc = (window as unknown as RedocGlobal).Redoc;
  if (!redoc) throw new Error("Redoc is not defined after loading the runtime");
  redoc.init(
    spec,
    {
      // 配色跟随主题：Redoc 自己不看 data-td-theme，只认传进来的 theme 对象。
      theme: { colors: { primary: { main: accent() } } },
      hideDownloadButton: false,
    },
    target,
  );
}

/** 主色从 CSS 变量读，与页面其余部分是一套。 */
function accent(root: HTMLElement = document.documentElement): string {
  return getComputedStyle(root).getPropertyValue("--color-accent").trim() || "#2f6fdb";
}

const rendered = new WeakSet<HTMLElement>();

/** 画一个实例。成功返回 true。 */
export async function render(host: HTMLElement): Promise<boolean> {
  const renderer = host.dataset.tdOpenapi;
  const spec = host.dataset.tdOpenapiSpec;
  if (!renderer || !spec || rendered.has(host)) return false;
  if (host.hasAttribute("data-td-openapi-unconfigured")) return false;

  const cfg = readConfig(renderer);
  if (!cfg) return false;

  rendered.add(host);
  try {
    if (renderer === "swagger") await renderSwagger(host, spec, cfg);
    else if (renderer === "redoc") await renderRedoc(host, spec, cfg);
    else return false;
    host.setAttribute("data-td-openapi-ready", "");
    return true;
  } catch (err) {
    // 不抛出去：一份画不出来的 spec 不该让同一页其他实例也画不出来。回落链接
    // 留在原地 —— 那份 JSON 本身对读者有用。
    console.warn(`openapi: ${renderer} failed to render`, err);
    host.setAttribute("data-td-openapi-failed", "");
    return false;
  }
}

/**
 * 进视口才加载。
 *
 * 这两个库都在一兆以上，而 API 文档常常在页面下半部分。rootMargin 给得比别处大
 * 一些：脚本大，提前开始取才不至于让读者滚到了还在等。
 */
export function init(doc: Document = document): void {
  const hosts = [...doc.querySelectorAll<HTMLElement>("[data-td-openapi]")];
  if (hosts.length === 0) return;

  lazyMount(hosts, "600px", (host) => void render(host));
}
