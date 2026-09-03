// 每一条 warn 都要说出它接下来做什么。
//
// 契约是「非法输入 warn + 有据可查的安全回落」。前半截靠 check-warnings.js
// 的夹具盯（那 24 个用例证明特定输入确实会出声），后半截没人盯 —— 而后半截
// 才是作者真正需要的：
//
//   `shortcode "card": title is required`     ← 然后呢？整页没了？这张卡没了？
//   `shortcode "card" needs a title; skipping this card`  ← 作者知道去改哪里
//
// 少了这半句不会让构建失败，也不会让页面出错，只会让作者盯着一条正确的警告
// 不知道该做什么。所以这里逐条要求消息里出现一个处置短语。
//
// 只查 warnf 的字面量消息。动态拼出来的消息（`printf` 组装再传进去）这里判不了
// —— 那种写法在这个仓库里没有，出现了再说。

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "layouts";

// 处置短语。每一条都对应一种真实的回落形状：
//   skipping / rendering nothing / including nothing  → 这一块不出
//   dropping / ignoring                              → 这个属性不出，其余照常
//   using / falling back / instead                    → 换成默认值
//   will not sync / not be                            → 功能降级但内容在
// 这张表不是我先想好再套上去的 —— 是把 316 条消息里已经写出来的处置动词收上来
// 得到的。它的作用是「下一条新加的 warn 必须说得跟现有这些一样清楚」，而不是
// 规定必须用哪个词。加一个新动词时把它补进来，别改消息去迁就这张表。
const DISPOSITIONS = [
  // 这一块不出
  "skipping",
  "skipped",
  "rendering ", // rendering nothing / rendering none / rendering it unnumbered / …
  "renders nothing",
  "including nothing",
  "printing nothing",
  "omitting",
  "highlighting nothing",
  "listing no ",
  "not collapsing",
  "stay unrendered",
  "stays unrendered",
  // 这一项不出，其余照常
  "dropping",
  "dropped",
  "ignoring",
  "ignored",
  "disabling",
  "disabled",
  "not injected",
  "not loaded",
  "loading without",
  "loading it anyway",
  // 换成别的值
  "using ",
  "falling back",
  "instead",
  "keeping",
  "keep ",
  "inferring",
  "leaving",
  "treating",
  "treated as",
  "expanding",
  "resolving",
  "stays",
  "wins",
  // 功能降级，内容仍在
  "will not",
  "run `pnpm", // 产物缺失：这一条给的是修复命令，比"回落"更有用
];

function templates(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...templates(full));
    else out.push(full);
  }
  return out;
}

const failures = [];
let checked = 0;
let dynamic = 0;

for (const file of templates(ROOT)) {
  const text = readFileSync(file, "utf8");
  // 注释里会讨论 warnf 与 errorf 本身，要去掉。但**换行必须留着** —— 直接删
  // 整段会让后面每一处的行号往前跳，报出来的位置指向一行毫不相干的代码
  // （实测：报 render-codeblock.html:32，那一行是另一个 partial 的参数）。
  // 一条门禁给错位置比不报还糟：读的人会先怀疑自己而不是怀疑门禁。
  const code = text.replace(/\{\{-?\s*\/\*[\s\S]*?\*\/\s*-?\}\}/g, (m) => m.replace(/[^\n]/g, " "));

  // errorf 一条都不许有。它让一个写错的属性变成整站构建失败 —— 而作者本来
  // 只是想预览自己刚写的那一页。
  for (const m of code.matchAll(/\berrorf\b/g)) {
    const line = code.slice(0, m.index).split("\n").length;
    failures.push(`${file}:${line}: errorf is banned; invalid author input warns and falls back`);
  }

  // warnf 的第一个参数：`warnf "..."` 的那个字面量。
  for (const m of code.matchAll(/\bwarnf\s+("(?:[^"\\]|\\.)*")/g)) {
    checked += 1;
    const message = m[1].toLowerCase();
    if (!DISPOSITIONS.some((d) => message.includes(d))) {
      const line = code.slice(0, m.index).split("\n").length;
      const shown = m[1].length > 74 ? `${m[1].slice(0, 74)}…` : m[1];
      failures.push(`${file}:${line}: warn does not say what it does instead: ${shown}`);
    }
  }
  // 非字面量的 warnf（第一个参数是变量或 printf）—— 数出来，不判。
  for (const m of code.matchAll(/\bwarnf\s+[^"\s]/g)) {
    dynamic += 1;
    void m;
  }
}

if (failures.length > 0) {
  for (const f of failures.slice(0, 40)) console.error(`FAIL  ${f}`);
  if (failures.length > 40) console.error(`... and ${failures.length - 40} more`);
  process.exit(1);
}

console.log(
  `ok  ${checked} warn message(s) name their fallback, 0 errorf` +
    (dynamic > 0 ? ` (${dynamic} built dynamically, not checked)` : ""),
);
