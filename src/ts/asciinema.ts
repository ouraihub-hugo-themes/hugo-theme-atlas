/**
 * 终端录屏播放器。
 *
 * 和 mermaid 同一条路：进视口才 import，页面上没有录屏就不加载。播放器加它的
 * 样式是 184 KB（gzip 66 KB），对一篇不含录屏的文档是纯浪费。
 *
 * 走默认入口而不是 `asciinema-player/ui.js`：后者把解析放进 Web Worker，签名
 * 要调用方自己提供 worker 的 URL，而 worker 文件不经过 Hugo 的资源管线就发布
 * 不出去（mermaid 的 chunk 是同一个坑）。默认入口把 core 跑在主线程，少一个
 * 需要自己管路径的文件。录屏是几十到几百 KB 的 JSON，主线程解析不卡。
 */

import type { Options, Player } from "asciinema-player";
import { lazyMount } from "./lazy-mount.js";

type CreateFn = (typeof import("asciinema-player"))["create"];

let loading: Promise<CreateFn> | null = null;

async function load(): Promise<CreateFn> {
  loading ??= import("asciinema-player").then((m) => m.create);
  return loading;
}

/**
 * 读者要求减少动效吗。matchMedia 缺席时按"不要求"处理。
 *
 * 默认参数用 globalThis 而不是 window：window 在非浏览器环境里是未定义的标识符，
 * 读它直接抛 ReferenceError，而 globalThis 到处都在。
 */
export function prefersReducedMotion(
  win: { matchMedia?: typeof matchMedia } = globalThis,
): boolean {
  return win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * 从 data 属性读播放选项。
 *
 * 每一项都要显式解析而不是把 dataset 整个塞给播放器：dataset 的值全是字符串，
 * `autoplay="false"` 传进去是真值，录屏会自己开始播。
 */
export function readOptions(el: HTMLElement, reducedMotion = prefersReducedMotion()): Options {
  const opts: Options = {};
  const d = el.dataset;

  // 布尔项只认 "true"：属性不存在、拼错、写了 "false" 都是关。
  //
  // 自动播放另外过一道 prefers-reduced-motion：一段自己动起来的终端录屏就是
  // 动效，而 CSS 关不掉它 —— 播放是脚本行为。作者写了 autoplay 也让位于读者的
  // 系统设置，他仍然可以点播放。
  if (d.tdCastAutoplay === "true" && !reducedMotion) opts.autoPlay = true;
  if (d.tdCastPreload === "true") opts.preload = true;
  if (d.tdCastLoop === "true") opts.loop = true;

  // 数值项要过 Number.isFinite：NaN 传进播放器会让它算出 NaN 的时间轴，
  // 进度条直接不动，而控制台一声不响。
  const speed = Number(d.tdCastSpeed);
  if (d.tdCastSpeed && Number.isFinite(speed) && speed > 0) opts.speed = speed;

  const idle = Number(d.tdCastIdle);
  if (d.tdCastIdle && Number.isFinite(idle) && idle > 0) opts.idleTimeLimit = idle;

  const cols = Number(d.tdCastCols);
  if (d.tdCastCols && Number.isInteger(cols) && cols > 0) opts.cols = cols;

  const rows = Number(d.tdCastRows);
  if (d.tdCastRows && Number.isInteger(rows) && rows > 0) opts.rows = rows;

  if (d.tdCastPoster) opts.poster = d.tdCastPoster;
  if (d.tdCastStart) opts.startAt = d.tdCastStart;

  return opts;
}

/**
 * 播放器的字体跟随主题的等宽字体。
 *
 * 不传的话它用自带的字体栈，同一页上录屏里的字和代码块的字不是一套 —— 读者
 * 会以为那是两种不同的东西。
 */
function terminalFont(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim();
}

const players = new WeakMap<HTMLElement, Player>();

/** 挂一个播放器。成功返回 true。 */
export async function mount(host: HTMLElement): Promise<boolean> {
  const src = host.dataset.tdCastSrc;
  const target = host.querySelector<HTMLElement>("[data-td-cast-out]");
  if (!src || !target || players.has(host)) return false;

  try {
    const create = await load();
    const font = terminalFont();
    const player = create(src, target, {
      ...readOptions(host),
      ...(font ? { terminalFontFamily: font } : {}),
    });
    players.set(host, player);
    host.setAttribute("data-td-cast-ready", "");
    return true;
  } catch (err) {
    // 不抛出去：一份取不到的录屏不该让同一页其他录屏也挂不上。
    console.warn("asciinema: player failed to mount", err);
    host.setAttribute("data-td-cast-failed", "");
    return false;
  }
}

export function init(doc: Document = document): void {
  const hosts = [...doc.querySelectorAll<HTMLElement>("[data-td-cast]")];
  if (hosts.length === 0) return;

  // 提前 200px 就够：录屏不像图，读者要点了才播，看到播放器外框就行。
  lazyMount(hosts, "200px", (host) => void mount(host));
}
