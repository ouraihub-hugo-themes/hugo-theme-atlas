// navbar 滚动阴影。
//
// 用哨兵 + IntersectionObserver，不用 scroll 监听：只需要知道"是否已滚离
// 顶部"这一个布尔值，它每次翻转最多触发一次回调，而 scroll 监听每帧都要
// 问一次同样的问题。
//
// 哨兵是 navbar 前面一个零高元素。它离开视口 = 页面已滚动。这比读 scrollY
// 更可靠：scrollY 的滚动容器在不同浏览器上可能是 html 或 body。

const SCROLLED = "data-td-nav-scrolled";

export function init(root: ParentNode = document): void {
  const nav = root.querySelector<HTMLElement>(".td-navbar");
  if (!nav) return;

  // 哨兵由脚本插入而不是写进模板：它是这个效果的实现细节，不是文档结构的
  // 一部分，无 JS 时不该出现在 DOM 里。
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;pointer-events:none";
  nav.parentNode?.insertBefore(sentinel, nav);

  new IntersectionObserver(
    ([entry]) => {
      if (entry) nav.toggleAttribute(SCROLLED, !entry.isIntersecting);
    },
    { threshold: 0 },
  ).observe(sentinel);
}
