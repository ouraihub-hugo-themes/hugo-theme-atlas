// 在目录里按候选名找文件，不区分大小写。
//
// 单独一个模块而不是留在 gen-vendor.js 里：那个脚本顶层有 `await build(...)`，
// import 它等于跑一遍 esbuild。而这个函数必须能被门禁单独调用 —— 它的正确性
// 只能靠真建文件来验，静态匹配配不出「候选数组里的变量喂给 existsSync」那对关系。
//
// 为什么必须大小写无关：同一个"许可文件"在 pnpm store 里有 13 种写法（LICENSE、
// license、license.txt、LICENCE…）。逐个 `existsSync` 探测在 NTFS 与 APFS 上会
// 「意外成功」—— 大小写不敏感，`LICENSE.txt` 命中磁盘上的 `license.txt`，ext4
// 命中不了。那时同一次提交在作者机器上绿、在 CI 上红。

import { readdirSync } from "node:fs";

/**
 * 命中返回磁盘上的**真实文件名**，未命中返回 null。
 *
 * 返回真实名字而不是候选名：调用方要用它去读文件，而在大小写敏感的系统上
 * 候选名可能打不开。目录读不到（不存在、无权限）时按未命中处理 —— 调用方
 * 关心的是"有没有这个文件"，不是目录本身出了什么事。
 *
 * @param {string} dir 目录
 * @param {readonly string[]} names 候选名，按优先级排列
 * @returns {string | null}
 */
export function findFile(dir, names) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  for (const want of names) {
    const hit = entries.find((e) => e.toLowerCase() === want.toLowerCase());
    if (hit) return hit;
  }
  return null;
}
