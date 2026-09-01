// 窄屏侧栏抽屉。
//
// 不用 <dialog>：同一个 <aside> 在宽屏是 position:sticky 的栅格列，
// showModal() 会把它提到 top layer 并脱离栅格，宽屏布局就没了。所以
// 焦点陷阱、Escape、背景惰性这几件 <dialog> 免费给的事要自己做。
//
// 惰性用 inert 而不是手工遍历 tabindex：inert 同时挡住焦点、指针和
// 辅助技术，一个属性覆盖三件事。

const OPEN = "data-td-shell-drawer-open";

export interface DrawerParts {
  panel: HTMLElement;
  toggles: HTMLElement[];
  closers: HTMLElement[];
  /** 抽屉开启时置为惰性的兄弟节点（正文、TOC）。 */
  inert: HTMLElement[];
}

export function collect(root: ParentNode = document): DrawerParts | null {
  const panel = root.querySelector<HTMLElement>("[data-td-shell-drawer]");
  if (!panel) return null;
  return {
    panel,
    toggles: [...root.querySelectorAll<HTMLElement>("[data-td-shell-drawer-toggle]")],
    closers: [...root.querySelectorAll<HTMLElement>("[data-td-shell-drawer-close]")],
    inert: [...root.querySelectorAll<HTMLElement>("[data-td-shell-drawer-inert]")],
  };
}

export function isOpen(panel: HTMLElement): boolean {
  return panel.hasAttribute(OPEN);
}

export function setOpen(parts: DrawerParts, open: boolean): void {
  const { panel, toggles, closers, inert } = parts;

  panel.toggleAttribute(OPEN, open);
  for (const el of closers) el.toggleAttribute(OPEN, open);
  for (const el of toggles) el.setAttribute("aria-expanded", String(open));
  for (const el of inert) el.inert = open;

  // 滚动锁在 <html> 而不是 <body>：iOS Safari 的滚动容器是根元素。
  document.documentElement.classList.toggle("td-scroll-locked", open);

  if (open) {
    // 焦点进面板。抽屉里第一个可聚焦项就是导航第一条，直接给它。
    panel.querySelector<HTMLElement>("a, button")?.focus();
  } else {
    toggles[0]?.focus();
  }
}

/** 焦点跑出面板就拉回来。用 focusin 冒泡，不逐个绑 keydown 猜 Tab 方向。 */
function trap(parts: DrawerParts, event: FocusEvent): void {
  const { panel } = parts;
  if (!isOpen(panel)) return;
  const target = event.target;
  if (target instanceof Node && !panel.contains(target)) {
    panel.querySelector<HTMLElement>("a, button")?.focus();
  }
}

export function init(root: ParentNode = document): void {
  const parts = collect(root);
  if (!parts) return;

  for (const el of parts.toggles) {
    el.setAttribute("aria-expanded", "false");
    el.addEventListener("click", () => setOpen(parts, !isOpen(parts.panel)));
  }
  for (const el of parts.closers) {
    el.addEventListener("click", () => setOpen(parts, false));
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen(parts.panel)) setOpen(parts, false);
  });

  document.addEventListener("focusin", (e) => trap(parts, e));

  // 视口变宽越过断点：抽屉概念消失，把状态清干净，否则 inert 和滚动锁
  // 会留在宽屏布局上。断点值与 shell.css 的 48rem 对齐。
  const wide = window.matchMedia("(width >= 48rem)");
  wide.addEventListener("change", (e) => {
    if (e.matches && isOpen(parts.panel)) setOpen(parts, false);
  });
}
