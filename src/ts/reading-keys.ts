/**
 * 阅读快捷键。`j` 下一节，`k` 上一节。
 *
 * **只有这两个。** 参照实现有十一个裸键（wasd 走侧栏树、qe 翻页、h 禅模式、
 * ly 切语言、t 切主题、r 轮导航、fc 开面板）。这里不跟：裸键快捷键抢的是
 * 整个字母表，而每抢一个就多一处"读者想在页面里按 t 却触发了别的"。
 * 侧栏本身可 Tab 可方向键（sidebar-nav.ts），翻页有链接，主题与面板已经各有
 * 入口 —— 它们不缺一个裸键。`j`/`k` 留下是因为它们做的事没有替代：连续往下
 * 读时，鼠标滚轮不认识"节"。
 *
 * **滚动交给浏览器。** `scrollIntoView({block:"start"})` 已经把 scrollport 的
 * scroll-padding 与目标自己的 scroll-margin 算进去了 —— 实测标题落在 66px
 * （正好是 scroll-padding-top），给它加 40px scroll-margin 之后落在 106px。
 * 所以这里不自己算偏移、不自己插值、不存取 scroll-behavior：主题没有全局
 * `scroll-behavior: smooth`，没有第二条动画要躲。
 */

import { nextIndex } from "./reading-keys-model.js";
import { pair, scrollPadding } from "./scroll-spy.js";

/** 焦点在能打字的地方吗。在的话裸键是普通字符，不能抢。 */
function typing(node: EventTarget | null): boolean {
  return (
    node instanceof HTMLInputElement ||
    node instanceof HTMLTextAreaElement ||
    node instanceof HTMLSelectElement ||
    (node instanceof HTMLElement && node.isContentEditable)
  );
}

/**
 * 这次按键该不该被这里接走。
 *
 * `isComposing` 与 `keyCode === 229` 是同一件事的两种报法：输入法组字中。
 * 组"jia"的时候第一个字母不该跳章节。旧引擎不报 isComposing，只报 229。
 *
 * `defaultPrevented` 让先绑的处理器优先 —— 对话框里的方向键已经被面板和搜索
 * 接过了。带修饰键的组合一概不管：那些是浏览器和别处的。
 */
function ignore(e: KeyboardEvent): boolean {
  return (
    e.isComposing ||
    e.keyCode === 229 ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    e.shiftKey ||
    e.defaultPrevented ||
    typing(e.target) ||
    document.querySelector("dialog[open]") !== null
  );
}

/**
 * 目录里那几个标题，按文档顺序。
 *
 * 复用 scroll-spy 的 `pair()`：取自目录而不是 `querySelectorAll("h2,h3")`，
 * 因为目录已经按层级配置筛过一遍，跳转顺序与右栏亮的那一条因此天然同源 ——
 * 各自选一遍标题的话，配置改了层级就会出现"跳到的节与亮的节不是一个"。
 * Map 保插入顺序，而目录里的顺序就是文档顺序，`currentIndex` 的单调前提
 * 靠这个成立。
 */
function headings(): HTMLElement[] {
  const toc = document.querySelector(".td-shell-toc");
  return toc ? [...pair(toc).values()] : [];
}

export function init(): void {
  // 连按用的游标。
  //
  // 主题默认不开平滑滚动，那时 `scrollIntoView` 是同步的（实测：调用后同一个
  // tick 里 rect 就从 1458 变成 66），游标是多余的。但站点加一行
  // `html { scroll-behavior: smooth }` 就变成异步 —— 同一个实测里 `scrollY`
  // 还是 0、rect 还是旧值。那时不记游标的表现是：按住 `j` 跳一节然后卡住，
  // 因为之后每次都测到"还在上一节"。
  //
  // 所以游标留着，代价是两个变量。它替站点的那行 CSS 兜底。
  let cursor: number | null = null;
  let settling = 0;

  document.addEventListener("keydown", (e) => {
    const delta = e.key === "j" ? 1 : e.key === "k" ? -1 : 0;
    if (delta === 0 || ignore(e)) return;

    const targets = headings();
    if (targets.length === 0) return;

    const line = scrollPadding();
    const tops = targets.map((h) => h.getBoundingClientRect().top);
    const index = nextIndex(tops, line, delta, cursor);
    if (index < 0) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const target = targets[index];
    if (!target) return;
    cursor = index;
    target.scrollIntoView({ block: "start" });

    // 地址栏跟上，这样刷新和分享落在同一节；用 replaceState 不用 hash 赋值 ——
    // 后者会再触发一次浏览器自己的锚点跳转，与刚做完的这次打架，而且每按一次
    // 就往回退历史里塞一条。
    const id = target.id;
    if (id) history.replaceState(null, "", `#${encodeURIComponent(id)}`);

    // 滚完放掉游标，回到实测 —— 读者用滚轮离开之后，下一次按 `j` 该从眼前
    // 这一节算，不是从上次跳到的那一节。
    //
    // 两条路都留着：`scrollend` 是"滚完了"的准确说法但 2023 年才普及，定时器
    // 兜住没有它的浏览器。哪条先到都只是把游标清空，重复无害。
    clearTimeout(settling);
    settling = window.setTimeout(release, 400);
  });

  addEventListener("scrollend", release, { passive: true });

  function release(): void {
    clearTimeout(settling);
    cursor = null;
  }
}
