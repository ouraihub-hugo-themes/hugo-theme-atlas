/**
 * 命令面板。`Ctrl/Cmd+K` 打开，列动作。
 *
 * 条目在 HTML 里就绪 —— 模板已经拼好了每一条的地址与标签，这里不构造条目，
 * 只做四件事：筛、选、执行、开合。所以没有条目模型、没有注册表、没有
 * manifest：那些是为了让站点配置能加动作而存在的，而动作全是主题内建的。
 *
 * 与搜索共用 `<dialog>` 的那一套（焦点陷阱、`::backdrop`、背景惰性由浏览器
 * 给），也共用同一条 Escape 的处理理由 —— 见下面。
 */

import { copyText, reportCopied } from "./clipboard.js";
import { rank } from "./palette-match.js";

interface Refs {
  dialog: HTMLDialogElement;
  input: HTMLInputElement;
  list: HTMLElement;
  empty: HTMLElement;
  status: HTMLElement;
  items: HTMLElement[];
}

/** 当前可见项里的高亮下标。-1 表示一个都不可见。 */
function visible(refs: Refs): HTMLElement[] {
  return refs.items.filter((el) => !el.hidden);
}

function select(refs: Refs, index: number): void {
  const rows = visible(refs);
  for (const el of refs.items) el.setAttribute("aria-selected", "false");
  const target = rows[index];
  if (!target) {
    refs.input.removeAttribute("aria-activedescendant");
    return;
  }
  target.setAttribute("aria-selected", "true");
  refs.input.setAttribute("aria-activedescendant", target.id);
  // 滚动交给浏览器算。手写 offsetTop 的版本要处理 sticky 表头与容器 padding，
  // 而 `block: "nearest"` 就是"够得着就不动"这个语义。
  target.scrollIntoView({ block: "nearest" });
}

/** 当前高亮项在可见项里的位置。 */
function selectedIndex(refs: Refs): number {
  return visible(refs).findIndex((el) => el.getAttribute("aria-selected") === "true");
}

function filter(refs: Refs, query: string): void {
  const labels = refs.items.map((el) => el.textContent ?? "");
  const keep = rank(labels, query);
  const order = new Set(keep);

  for (const [i, el] of refs.items.entries()) el.hidden = !order.has(i);
  // 按档重排 DOM。`append` 一个已在树里的节点会把它移过去，所以这就是重排 ——
  // 不必先摘再插。
  for (const i of keep) {
    const el = refs.items[i];
    if (el) refs.list.append(el);
  }

  refs.empty.textContent = keep.length === 0 ? (refs.status.dataset.tdPaletteNone ?? "") : "";
  // 筛完之后高亮回到第一条：读者敲了一个字母，此刻第一条才是他要的那个。
  select(refs, 0);
}

let copyTimer: number | undefined;

function run(refs: Refs, item: HTMLElement): void {
  const action = item.dataset.tdAction;
  const url = item.dataset.tdUrl;

  if (action === "theme") {
    // 复用主题切换按钮而不是自己写一遍：那个按钮上挂着写 localStorage 与
    // 改 documentElement 的完整逻辑，这里再实现一次就有了两处真相。
    document.querySelector<HTMLElement>("[data-td-theme-toggle]")?.click();
    refs.dialog.close();
    return;
  }

  if (action === "print") {
    // 先关再打印：打印对话框会把此刻的页面截下来，面板开着就印在纸上了。
    refs.dialog.close();
    window.print();
    return;
  }

  if (action === "search") {
    refs.dialog.close();
    document.querySelector<HTMLElement>("[data-td-search-open]")?.click();
    return;
  }

  if (action === "copy-link" && url) {
    void copyText(url).then((ok) => {
      if (ok) copyTimer = reportCopied(item, refs.status, "tdPaletteCopied", copyTimer);
    });
    // 不关。复制之后关掉的话，读者看不到"已复制"那一下反馈。
    return;
  }

  if (action === "open" && url) {
    refs.dialog.close();
    // 外站一律新窗口 + noopener。地址是构建期拼的，都是 https 的第三方或 forge。
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function init(): void {
  const dialog = document.querySelector<HTMLDialogElement>("[data-td-palette]");
  if (!dialog) return;

  const input = dialog.querySelector<HTMLInputElement>("[data-td-palette-input]");
  const list = dialog.querySelector<HTMLElement>("[data-td-palette-list]");
  const empty = dialog.querySelector<HTMLElement>("[data-td-palette-empty]");
  const status = dialog.querySelector<HTMLElement>("[data-td-palette-status]");
  if (!input || !list || !empty || !status) return;

  const items = [...list.querySelectorAll<HTMLElement>(".td-palette-item")];
  if (items.length === 0) return;

  const refs: Refs = { dialog, input, list, empty, status, items };

  input.addEventListener("input", () => filter(refs, input.value));

  const open = (): void => {
    if (dialog.open) return;
    // 每次打开从干净状态开始：上次的筛选词留着的话，读者按 Ctrl+K 看到的是
    // 一份筛过的列表，而他没有打字。
    input.value = "";
    filter(refs, "");
    dialog.showModal();
    input.focus();
  };

  dialog
    .querySelector<HTMLElement>("[data-td-palette-close]")
    ?.addEventListener("click", () => dialog.close());

  // 点 backdrop 关闭。目标是 dialog 本身说明点在了内容之外。
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  // 条目用 click 而不是逐项绑：条目会被重排，而委托不在乎顺序。
  list.addEventListener("click", (e) => {
    const item = (e.target as Element).closest<HTMLElement>(".td-palette-item");
    if (item && !item.hidden) run(refs, item);
  });

  // 悬停跟着走高亮，只认鼠标 —— 触屏滚动会派发 pointermove，那时移动高亮
  // 等于读者一滑就换了选中项。
  list.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const item = (e.target as Element).closest<HTMLElement>(".td-palette-item");
    if (!item || item.hidden) return;
    const index = visible(refs).indexOf(item);
    if (index >= 0) select(refs, index);
  });

  dialog.addEventListener("keydown", (e) => {
    // 输入法组字中不拦。`keyCode === 229` 是几个引擎在组字时给的哨兵值，
    // `isComposing` 之外还要判它。
    if (e.isComposing || e.keyCode === 229) return;

    const rows = visible(refs);
    const at = selectedIndex(refs);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      select(refs, Math.min(at + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      select(refs, Math.max(at - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = rows[at];
      if (item) run(refs, item);
    } else if (e.key === "Escape") {
      // 自己接，理由与搜索那边同一个：输入框会先把 Escape 当成"清空"消费掉，
      // 于是焦点在框里（也就是刚打开的默认状态）时要按两次才关。这里是
      // `type="text"` 所以不清空，但 `preventDefault` 保住的是同一件事 ——
      // 一次按键一个结果。
      e.preventDefault();
      dialog.close();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "k" || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    // 不判焦点在哪：`Ctrl+K` 带修饰键，不与打字冲突，所以输入框里按它也该开。
    // 这与 `/` 不同 —— 那个裸键在输入框里是一个普通字符。
    e.preventDefault();
    if (dialog.open) dialog.close();
    else open();
  });
}
