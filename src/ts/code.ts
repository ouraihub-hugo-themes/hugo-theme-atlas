/**
 * 代码块运行时：复制与折叠。
 *
 * 两件事都是渐进增强。没有 JS 时：复制按钮不出现在 HTML 里（模板只在
 * copy 开启时才画它，但它的动作全靠这里），折叠按钮带 hidden，代码块完整
 * 展开 —— 一个点不动的按钮比多出几行代码更糟。
 */

import { copyText, reportCopied } from "./clipboard.js";

/**
 * 取代码块的纯文本。
 *
 * 从 <pre> 读 textContent 而不是 innerText：后者受 CSS 影响，软换行开启时
 * 会把折行位置当成真换行插进去，复制出来的命令就断了。
 *
 * 行号在 lntable 布局下是表格里独立的一列，textContent 会把它们一并带上。
 * 只取代码那一侧的单元格。
 */
export function codeText(viewport: Element): string {
  const lntd = viewport.querySelector(".lntable td:last-child");
  const source = lntd ?? viewport.querySelector("pre");
  return source?.textContent ?? "";
}

/** 按可见行数与实际行高算出折叠高度。 */
export function collapsedHeight(lineHeight: number, lines: number, padding: number): number {
  return lineHeight * lines + padding;
}

function initCopy(root: HTMLElement): void {
  const button = root.querySelector<HTMLButtonElement>("[data-td-code-copy]");
  const viewport = root.querySelector("[data-td-code-viewport]");
  if (!button || !viewport) return;

  const status = root.querySelector("[data-td-code-status]");
  let timer: number | undefined;

  // 监听器本身同步：async 监听器返回的 promise 无人接管，它的拒绝会变成
  // unhandledrejection。copyText() 自己吞掉失败，这里只消费结果。
  button.addEventListener("click", () => {
    void copyText(codeText(viewport)).then((ok) => {
      if (ok) timer = reportCopied(button, status, "tdCodeCopied", timer);
    });
  });
}

function initCollapse(root: HTMLElement): void {
  const button = root.querySelector<HTMLButtonElement>("[data-td-code-expand]");
  const viewport = root.querySelector<HTMLElement>("[data-td-code-viewport]");
  if (!button || !viewport) return;

  const lines = Number(root.dataset.tdCollapseLines ?? 0);
  if (!Number.isFinite(lines) || lines <= 0) return;

  const pre = viewport.querySelector("pre");
  if (!pre) return;

  // 行高从渲染结果读，不在构建时算：等宽字体载入前后行高不同，写死的像素
  // 值会在字体切换时错位。padding 一并算进去，否则折叠处会切在半行上。
  const styles = getComputedStyle(pre);
  const lineHeight = parseFloat(styles.lineHeight);
  const padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  if (Number.isFinite(lineHeight)) {
    root.style.setProperty("--td-code-max-h", `${collapsedHeight(lineHeight, lines, padding)}px`);
  }

  button.hidden = false;

  const label = button.querySelector("span") ?? button;
  button.addEventListener("click", () => {
    const expanded = root.hasAttribute("data-td-code-expanded");
    if (expanded) {
      root.removeAttribute("data-td-code-expanded");
      label.textContent = button.dataset.tdLabelExpand ?? "";
    } else {
      root.setAttribute("data-td-code-expanded", "");
      label.textContent = button.dataset.tdLabelCollapse ?? "";
    }
    button.setAttribute("aria-expanded", String(!expanded));
  });
}

export function init(doc: Document = document): void {
  for (const root of doc.querySelectorAll<HTMLElement>("[data-td-code]")) {
    initCopy(root);
    initCollapse(root);
  }
}
