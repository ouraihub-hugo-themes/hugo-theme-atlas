/**
 * 让溢出的滚动区可被键盘触达。
 *
 * 一个 `overflow: auto` 的容器鼠标能滚、键盘不能 —— 它不可聚焦，方向键的
 * 焦点不在它身上。加 tabindex="0" 就能聚焦，之后方向键归浏览器处理，不需要
 * 自己实现滚动。
 *
 * 为什么不给所有滚动区都加：没溢出的容器加了 tabindex 就是一个停下来什么都
 * 做不了的 tab 站点。一张能装进列宽的表不该抢一次 Tab。
 *
 * 为什么需要 role 与 label：可聚焦元素必须有可访问名，否则屏幕阅读器读到一个
 * 没有身份的停靠点。role="region" + aria-label 让它读作"可滚动区域"。
 */

const SELECTOR = ".td-table-scroll";

/** 滚动容器的四个尺寸。取成入参而非读元素，判断逻辑才能脱离 DOM 测。 */
export interface Extent {
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
}

/** 内容是否真的超出可视范围。 */
export function overflows(e: Extent): boolean {
  // 1px 容差：亚像素布局下 scrollWidth 常比 clientWidth 大零点几，不放过
  // 这点差就会给每张装得下的表都挂上 tabindex。
  return e.scrollWidth - e.clientWidth > 1 || e.scrollHeight - e.clientHeight > 1;
}

/** 按当前溢出状态挂上或摘掉可聚焦性。 */
export function sync(el: HTMLElement, label: string): void {
  if (overflows(el)) {
    if (el.tabIndex !== 0) {
      el.tabIndex = 0;
      el.setAttribute("role", "region");
      el.setAttribute("aria-label", label);
    }
  } else if (el.hasAttribute("tabindex")) {
    el.removeAttribute("tabindex");
    el.removeAttribute("role");
    el.removeAttribute("aria-label");
  }
}

export function init(doc: Document = document): void {
  const regions = [...doc.querySelectorAll<HTMLElement>(SELECTOR)];
  if (regions.length === 0) return;

  const run = () => {
    for (const el of regions) sync(el, el.dataset.tdScrollLabel ?? "Scrollable region");
  };
  run();

  // 溢出与否随容器宽度变，字体载入完也会变。ResizeObserver 覆盖两者 ——
  // resize 事件只在视口变化时触发，侧栏拖拽改变列宽时收不到。
  const ro = new ResizeObserver(run);
  for (const el of regions) {
    ro.observe(el);
    // 表格自身的宽度变化（列内容重排）不会改变容器尺寸，要一并观察。
    const table = el.firstElementChild;
    if (table) ro.observe(table);
  }
}
