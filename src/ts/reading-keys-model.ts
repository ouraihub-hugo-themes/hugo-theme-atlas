/**
 * `j` / `k` 跳标题的选择逻辑。纯函数，不碰 DOM —— 这里全是几个容差常数，
 * 而容差是最容易在重构里被"整理"掉的东西，所以它们有测试。
 */

/**
 * 判「已经读到这一节」时给的余量，像素。
 *
 * 不能是 0。`scrollIntoView` 把标题停在阅读线上之后，`getBoundingClientRect()
 * .top` 读到的是 **66.0625**，而阅读线是 66 —— 实测，设备像素比还只是 1。
 * 布局用的是分数像素，落点几乎不会正好等于那个整数。
 *
 * 严格比较的表现是：按 `j` 跳到某节，再按 `j` 又跳回同一节，因为上一次的落点
 * 算作"还没到"。缩放或 HiDPI 下误差更大，所以余量取到 8 而不是贴着 0.1。
 */
const REACHED_SLACK = 8;

/**
 * `k` 先回本节节首的阈值，像素。
 *
 * 读到一节中间按 `k`，期望是回到这一节的开头，不是跳过整节去上一节。超过这个
 * 距离就认为"读进去了"，`k` 先把你送回节首；已经在节首附近再按才去上一节。
 */
const RE_ANCHOR = 40;

/**
 * 当前读到第几个标题，没有则 -1。
 *
 * `tops` 是各标题相对视口顶端的位置，必须按文档顺序。`line` 是阅读线
 * （scroll-padding-top）。越过阅读线的最后一个就是当前节。
 *
 * 一旦遇到没越线的就停：标题在文档里自上而下，后面的只会更靠下。这个前提在
 * 目录派生的标题列表上成立。
 */
export function currentIndex(tops: readonly number[], line: number): number {
  let current = -1;
  for (const [i, top] of tops.entries()) {
    if (top > line + REACHED_SLACK) break;
    current = i;
  }
  return current;
}

/**
 * 按一次 `j`（delta 1）或 `k`（delta -1）之后该去第几个标题。
 *
 * `cursor` 非空时用它代替实测位置：连按时上一次的滚动可能还在路上，重新测
 * rect 会读到"还在上一个标题"，于是第二次按键原地不动。按住 `j` 的表现就是
 * 跳一节然后卡住。
 *
 * 返回 -1 表示不动（已经在两端）。回到 `cursor` 自己是合法结果 —— 那就是
 * `k` 的回节首。
 */
export function nextIndex(
  tops: readonly number[],
  line: number,
  delta: 1 | -1,
  cursor: number | null,
): number {
  if (tops.length === 0) return -1;

  if (cursor !== null) {
    const target = cursor + delta;
    return target >= 0 && target < tops.length ? target : -1;
  }

  const current = currentIndex(tops, line);

  // 读进本节深处后按 `k`：先回本节节首。
  const top = tops[current];
  if (delta === -1 && current >= 0 && top !== undefined && top < line - RE_ANCHOR) {
    return current;
  }

  const target = current + delta;
  // `j` 在最后一节、`k` 在第一节之前都不动 —— 不循环。跳回顶部的键是 Home，
  // 浏览器已经有了。
  return target >= 0 && target < tops.length ? target : -1;
}
