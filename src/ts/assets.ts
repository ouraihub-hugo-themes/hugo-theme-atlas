/**
 * 资产表运行时：复制单个校验和，或整段复制。
 *
 * 全是渐进增强。没有 JS 时两个按钮都带 hidden，校验和以完整形式铺开 ——
 * 读者可以自己框选，不需要按钮。
 */

import { copyText, reportCopied } from "./clipboard.js";

/**
 * 一行的 sha*sum 形式文本。
 *
 * 用两个空格而不是一个：这是 coreutils 的文本模式格式，粘到 `sha256sum -c`
 * 里能直接校验。一个空格的版本它不认。
 */
export function assetLine(hash: string, name: string): string {
  return `${hash}  ${name}`;
}

/** 整段复制的内容：每行一条，末尾带换行 —— 少了它 `sha256sum -c` 会漏掉最后一行。 */
export function assetBlock(rows: Iterable<{ hash: string; name: string }>): string {
  const lines = [...rows].map((r) => assetLine(r.hash, r.name));
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

function rowData(row: HTMLElement): { hash: string; name: string } | null {
  const hash = row.dataset.tdAssetHash;
  const name = row.dataset.tdAssetName;
  return hash && name ? { hash, name } : null;
}

export function init(doc: Document = document): void {
  for (const root of doc.querySelectorAll<HTMLElement>("[data-td-assets]")) {
    const status = root.querySelector("[data-td-assets-status]");

    for (const row of root.querySelectorAll<HTMLElement>("[data-td-asset]")) {
      const button = row.querySelector<HTMLButtonElement>("[data-td-asset-copy]");
      const data = rowData(row);
      if (!button || !data) continue;

      button.hidden = false;
      let timer: number | undefined;
      // 监听器同步：async 监听器返回的 promise 无人接管，拒绝会变成
      // unhandledrejection。copyText() 自己吞掉失败，这里只消费结果。
      button.addEventListener("click", () => {
        void copyText(assetLine(data.hash, data.name)).then((ok) => {
          if (ok) timer = reportCopied(button, status, "tdAssetsCopied", timer);
        });
      });
    }

    const all = root.querySelector<HTMLButtonElement>("[data-td-assets-copy-all]");
    if (!all) continue;
    const rows = [...root.querySelectorAll<HTMLElement>("[data-td-asset]")]
      .map(rowData)
      .filter((r): r is { hash: string; name: string } => r !== null);
    if (rows.length === 0) continue;

    all.hidden = false;
    let allTimer: number | undefined;
    all.addEventListener("click", () => {
      void copyText(assetBlock(rows)).then((ok) => {
        if (ok) allTimer = reportCopied(all, status, "tdAssetsCopied", allTimer);
      });
    });
  }
}
