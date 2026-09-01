/**
 * 标签页运行时。
 *
 * 服务端已经渲染出可用的结构：默认 panel 可见，其余带 hidden。没有 JS 时
 * 读者看到第一个标签页的内容加所有 panel 的标题 —— 少了切换，但没有内容
 * 丢失。这里加的是切换、键盘导航，以及命名组的同步、深链与持久化。
 *
 * 只有命名组（`group="x"`）同步、写 hash、进 localStorage。匿名组的 value
 * 是按位置生成的 tab1/tab2，跨页面同步它毫无意义 —— 两页的 tab1 不是同
 * 一回事。
 */

const STORE_PREFIX = "td-tabs:";

/** 一组标签页里所有标签按钮，按 DOM 顺序。 */
function tabsOf(root: Element): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(':scope > [role="tablist"] > [role="tab"]')];
}

function panelsOf(root: Element): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(':scope > [role="tabpanel"]')];
}

function valueOf(element: HTMLElement): string {
  return element.dataset.tdTabsValue ?? "";
}

/**
 * 下一个索引。抽出来是因为它是这个文件里唯一值得单测的分支：环绕、
 * Home/End、RTL 下方向键互换，四种情况都容易写错一位。
 */
export function nextIndex(key: string, index: number, count: number, rtl: boolean): number | null {
  if (count === 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  const forward = key === (rtl ? "ArrowLeft" : "ArrowRight");
  const backward = key === (rtl ? "ArrowRight" : "ArrowLeft");
  if (forward) return (index + 1) % count;
  if (backward) return (index - 1 + count) % count;
  return null;
}

/**
 * 在一组里显示某个 value。组里没有这个 value 时什么都不做并返回 false ——
 * 同步绝不能让某一组变成"没有选中项"。
 */
function activate(root: Element, value: string, focus = false): boolean {
  const tabs = tabsOf(root);
  const target = tabs.find((tab) => valueOf(tab) === value);
  if (!target) return false;

  for (const tab of tabs) {
    const selected = tab === target;
    tab.setAttribute("aria-selected", String(selected));
    // 组内只有选中项可被 Tab 键到达，组内移动用方向键。
    tab.tabIndex = selected ? 0 : -1;
  }
  for (const panel of panelsOf(root)) {
    panel.hidden = valueOf(panel) !== value;
  }
  if (focus) target.focus();
  return true;
}

function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Safari 的隐私模式下 localStorage 会抛，不是返回 null。
    return null;
  }
}

function writeStore(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 配额满或被禁用。选择只是偏好，丢了不影响功能。
  }
}

export function init(doc: Document = document, win: Window = window): void {
  const sets = [...doc.querySelectorAll<HTMLElement>("[data-td-tabs]")];
  if (sets.length === 0) return;

  // 标记在 <html> 上而非每个组上：CSS 靠它隐藏 panel 里重复的标签名，加在
  // 组上要等遍历到那一组，中间会闪一下标题。
  doc.documentElement.classList.add("td-js-tabs");

  const groupOf = (root: HTMLElement) => root.dataset.tdTabsGroup ?? "";

  const select = (root: HTMLElement, value: string, origin: "click" | "keyboard" | "hash") => {
    if (!activate(root, value, origin === "keyboard")) return;
    const group = groupOf(root);
    if (!group) return;

    if (origin !== "hash") {
      writeStore(STORE_PREFIX + group, value);
      // replaceState 而非 location.hash：后者会往历史里压一条，读者按返回
      // 键得先退回上一个标签页才能离开这一页。
      try {
        win.history.replaceState(win.history.state, "", `#${group}-${value}`);
      } catch {
        // file:// 之类不允许改 URL 的场景。
      }
    }
    for (const peer of sets) {
      if (peer !== root && groupOf(peer) === group) activate(peer, value);
    }
  };

  for (const root of sets) {
    const list = root.querySelector<HTMLElement>(':scope > [role="tablist"]');
    if (!list) continue;

    list.addEventListener("click", (event) => {
      const tab = (event.target as Element | null)?.closest<HTMLElement>('[role="tab"]');
      if (!tab || tab.parentElement !== list) return;
      select(root, valueOf(tab), "click");
    });

    list.addEventListener("keydown", (event) => {
      const tabs = tabsOf(root);
      const index = tabs.indexOf(event.target as HTMLElement);
      if (index === -1) return;
      // 组自己在 RTL 里也可能是 LTR（比如整站 RTL 但某段内容标了 dir）。
      const rtl = getComputedStyle(root).direction === "rtl";
      const next = nextIndex(event.key, index, tabs.length, rtl);
      const target = next === null ? undefined : tabs[next];
      if (!target) return;
      // 方向键在 tablist 里归组内移动，不该滚页面。
      event.preventDefault();
      select(root, valueOf(target), "keyboard");
    });

    // 恢复顺序：hash > localStorage > 服务端渲染的默认值。hash 优先是因为
    // 它是别人分享给你的那一份，比你自己上次选的更该被尊重。
    const group = groupOf(root);
    if (group) {
      const stored = readStore(STORE_PREFIX + group);
      if (stored) activate(root, stored);
    }
  }

  const applyHash = () => {
    const hash = win.location.hash.slice(1);
    if (!hash) return;
    // `组名-值`，而组名本身可以含 `-` —— 从右往左试每个分界点。
    for (let cut = hash.lastIndexOf("-"); cut > 0; cut = hash.lastIndexOf("-", cut - 1)) {
      const group = hash.slice(0, cut);
      const value = hash.slice(cut + 1);
      const matching = sets.filter((root) => groupOf(root) === group);
      if (matching.length === 0) continue;
      for (const root of matching) activate(root, value);
      return;
    }
  };

  applyHash();
  win.addEventListener("hashchange", applyHash);
}
