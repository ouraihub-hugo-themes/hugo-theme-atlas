/**
 * 分享条里的「复制链接」。
 *
 * 只有这一项要 JS —— 其余目标都是构建期拼好的普通链接。所以这里没有"分享
 * 运行时"，只有一个复制按钮的处理器，与代码块、资产表共用 clipboard.ts。
 */

import { copyText, reportCopied } from "./clipboard.js";

export function init(): void {
  const status = document.querySelector("[data-td-share-status]");
  let timer: number | undefined;

  for (const button of document.querySelectorAll<HTMLElement>("[data-td-share-copy]")) {
    const url = button.dataset.tdCopy;
    if (!url) continue;

    // 监听器同步，与 assets.ts 一致：async 监听器返回的 promise 无人接管。
    button.addEventListener("click", () => {
      // 复制失败（HTTP 部署下没有 navigator.clipboard，或权限被拒）就什么都
      // 不说：这时地址栏里就是那个地址，读者自己能取到，而一句"复制失败"
      // 帮不上任何忙。
      void copyText(url).then((ok) => {
        if (ok) timer = reportCopied(button, status, "tdShareCopied", timer);
      });
    });
  }
}
