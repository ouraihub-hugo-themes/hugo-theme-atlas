// TOC 当前小节高亮。
//
// 判据是「已越过阅读线的最后一个标题」，不是「落在某个判定区内的标题」。
// 区间模型两头都不成立：区宽了一屏能装下两个标题，高亮会跑到读者所在小节
// 的下一节；区窄了滚到小节中段时区内没有任何标题，高亮会闪掉。
//
// 用 rAF 节流的 scroll 监听而不是 IntersectionObserver：判据既然是几何比较，
// 观察器只能提供「有标题跨界」的时机，覆盖不到滚在小节中段和锚点直接落地这
// 两种没有跨界事件的情况，仍要补一条 scroll 路径 —— 那观察器就是白搭的一层。
// 读 getBoundingClientRect 放在 rAF 回调里，是浏览器的读阶段，不触发强制重排。

const ACTIVE = "data-td-toc-active";

/** 阅读线之下多少像素内仍算「未越线」。给标题自身的高度留出余量。 */
const LINE_SLACK = 4;

/** TOC 链接到目标标题的映射。锚点解析不出目标就跳过，不猜。 */
export function pair(toc: ParentNode, doc: ParentNode = document): Map<Element, HTMLElement> {
  const map = new Map<Element, HTMLElement>();
  for (const link of toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
    const id = decodeURIComponent(link.hash.slice(1));
    if (!id) continue;
    // 用属性选择器而非 getElementById：后者只在 Document 上有，这里要能
    // 接受任意注入根以便测试。CSS.escape 挡住 id 里的特殊字符。
    const target = doc.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (target) map.set(link, target);
  }
  return map;
}

/**
 * 是否已滚到文档底部。
 *
 * 单独成函数是因为它有一个不显然的前提：页面必须真的能滚。内容不足一屏时
 * scrollTop 恒为 0 且已等于上限，若不排除就会在一个整页可见的短文档上高亮
 * 末节 —— 读者看到的是全文，该亮的是第一节。
 */
export function atDocumentBottom(scrollTop: number, viewport: number, content: number): boolean {
  const max = content - viewport;
  return max > 1 && scrollTop >= max - 2;
}

/**
 * 选中最后一个已越过阅读线的标题。
 *
 * 全都在线下（读者还在首屏正文之上）时给第一个 —— TOC 不该在页面顶部空着，
 * 读者此刻正要读的就是第一节。
 */
export function pickActive(
  pairs: Iterable<[Element, HTMLElement]>,
  /** 标题上沿相对阅读线的偏移，≤0 表示已越线。 */
  offsetOf: (heading: HTMLElement) => number,
  /**
   * 已滚到文档底部。此时直接给末项：末屏内的标题永远到不了阅读线，
   * 越线判据在这里失效，读者却明确在读最后一节。
   *
   * ponytail: 末屏内的中间标题会被跳过（从倒数第五节直接跳到末节）。
   * 要逐个点亮就得按标题在末屏内的位置分配，等有人真的抱怨再做。
   */
  atBottom = false,
): Element | null {
  let crossed: Element | null = null;
  let first: Element | null = null;
  let last: Element | null = null;
  for (const [link, heading] of pairs) {
    first ??= link;
    last = link;
    if (offsetOf(heading) <= LINE_SLACK) crossed = link;
  }
  if (atBottom && last) return last;
  return crossed ?? first;
}

export function init(root: ParentNode = document): void {
  const toc = root.querySelector(".td-shell-toc");
  if (!toc) return;

  const map = pair(toc, root);
  if (map.size === 0) return;

  let current: Element | null = null;

  const paint = () => {
    const doc = document.documentElement;
    // 阅读线就是 base.css 那条 scroll-padding-top —— 直接读它算出来的值，不
    // 重算一遍那个式子。锚点跳转的落点必须正好算作已越线，否则点目录会看到
    // 高亮停在上一节，而两处各写一遍式子的话，改了一处就是这个症状。
    const line = scrollPadding();
    const next = pickActive(
      map,
      (h) => h.getBoundingClientRect().top - line,
      atDocumentBottom(scrollY, innerHeight, doc.scrollHeight),
    );
    if (next === current) return;
    current?.removeAttribute(ACTIVE);
    next?.setAttribute(ACTIVE, "");
    current = next;
  };

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  paint();

  let queued = false;
  function schedule(): void {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      paint();
    });
  }
}

/**
 * 锚点跳转后标题停在的高度，像素。reading-keys.ts 判「当前读到哪一节」用同
 * 一个值 —— 两处必须一致，否则 `j` 跳到的那一节与目录亮的那一条会差一节。
 *
 * 读 `scroll-padding-top` 而不是读 `--td-shell-nav-h` 再加 16：自定义属性是
 * **不解析**存着的。`getPropertyValue("--td-shell-nav-h")` 在站点把它改成
 * `3.5rem` 之后返回的就是字符串 `"3.5rem"`，`parseFloat` 拿到 3.5 —— 当像素
 * 用的话阅读线会差 52.5px，表现是滚过整整一节高亮还停在上一条。实测过；
 * 同一时刻 `scrollPaddingTop` 是 `"72px"`，calc 与单位都算完了。
 *
 * 没有 scroll-padding 的文档（或者旧浏览器返回 `auto`）落到 0：那时锚点落在
 * 视口顶端，阅读线也该在顶端。
 */
export function scrollPadding(): number {
  const raw = getComputedStyle(document.documentElement).scrollPaddingTop;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}
