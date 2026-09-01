/**
 * 剪贴板。代码块与资产表共用。
 *
 * 抽出来是因为第二个调用方出现了，不是为了预留 —— 两处各写一遍的话，"HTTP
 * 部署下 navigator.clipboard 是 undefined" 这个判断会漏掉一处，而漏掉的那处
 * 在开发机（localhost 算安全上下文）上永远看不出问题。
 */

/** 复制成功后按钮保持"已复制"状态的时长。 */
export const COPIED_MS = 2000;

export async function copyText(text: string): Promise<boolean> {
  // navigator.clipboard 需要安全上下文（https 或 localhost）。HTTP 部署下它
  // 是 undefined，不是抛错 —— 直接判断，不靠 try 兜。
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 用户拒绝了剪贴板权限。
    return false;
  }
}

/**
 * 把一次复制的结果反馈到按钮与播报区。
 *
 * 播报区是必需的：按钮上的图标或颜色变化对屏幕阅读器不可见。定时器清空播报
 * 区，下一次复制才会被当成新消息读出来 —— 内容不变的 aria-live 区域不触发
 * 播报。
 *
 * 返回定时器 id，调用方要在下一次复制前 clearTimeout，否则两次快速点击会让
 * 第一次的定时器提前清掉第二次的状态。
 */
export function reportCopied(
  button: HTMLElement,
  status: Element | null,
  flag: string,
  previous?: number,
): number {
  button.dataset[flag] = "";
  if (status) status.textContent = button.dataset.tdLabelCopied ?? "Copied";

  clearTimeout(previous);
  return window.setTimeout(() => {
    delete button.dataset[flag];
    if (status) status.textContent = "";
  }, COPIED_MS);
}
