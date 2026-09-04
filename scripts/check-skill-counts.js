// 校验 SKILL.md 里的硬编码数字与真实来源一致。
//
// 用法：node scripts/check-skill-counts.js
//
// SKILL.md 是手写的散文，不该变成生成物 —— 它的价值在于「先读哪一份、什么时候读」，
// 那是判断不是结构。但它里面有五个数字是对外承诺，而没有任何东西看着它们。
//
// 端到端实测抓到其中一个错了：它说 data/icons.json 有 76 个图标，真实是 72
// （另外四个是 $comment 开头的注释键）。这类数字会被当权威用来判断「某个名字
// 该不该存在」，错一个就是一次错误的排查方向。

import { readFileSync, readdirSync } from "node:fs";

const SKILL = "skills/hugo-theme-atlas/SKILL.md";
const md = readFileSync(SKILL, "utf8");

/** 目录里的 .html 个数，可选前缀过滤。 */
function count(dir, prefix = "") {
  return readdirSync(dir).filter((f) => f.endsWith(".html") && f.startsWith(prefix)).length;
}

const icons = Object.keys(JSON.parse(readFileSync("data/icons.json", "utf8"))).filter(
  // `$` 开头的是文件内的分组注释，不是图标名。
  (k) => !k.startsWith("$"),
).length;

const shells = [
  ...(/shell_types \| default \(slice ((?:"[a-z_]+" ?)+)\)/
    .exec(readFileSync("layouts/_partials/shell/resolve.html", "utf8"))?.[1]
    ?.matchAll(/"([a-z_]+)"/g) ?? []),
].length;

const facts = [
  { what: "shortcodes", n: count("layouts/_shortcodes"), re: /(\d+) shortcodes/g },
  { what: "fence languages", n: count("layouts/_markup", "render-codeblock-"), re: /(\d+) fence languages/g },
  { what: "landing sections", n: count("layouts/_partials/landing/section"), re: /(\d+) landing\s+sections/g },
  { what: "reading shells", n: shells, re: /(\d+) reading shells/g },
  { what: "icons", n: icons, re: /\((\d+) names\)/g },
];

const bad = [];
for (const f of facts) {
  const found = [...md.matchAll(f.re)].map((m) => Number(m[1]));
  if (found.length === 0) {
    bad.push(`${f.what}: SKILL.md no longer states a count (expected ${f.n})`);
    continue;
  }
  for (const got of found) {
    if (got !== f.n) bad.push(`${f.what}: SKILL.md says ${got}, the source has ${f.n}`);
  }
}

// 围栏那个数减去基础 hook —— 它不是一种语言。
const baseHook = "render-codeblock.html";
if (!readdirSync("layouts/_markup").includes(baseHook)) {
  bad.push(`layouts/_markup/${baseHook} is gone; the fence count subtracts it`);
}

if (bad.length > 0) {
  for (const n of bad) console.error(`FAIL  ${n}`);
  console.error(
    "\nSKILL.md 的数字是对外承诺，会被当权威用来判断某个名字该不该存在。" +
      "改了来源就要改它，或者改这里的判据。",
  );
  process.exit(1);
}

console.log(
  `ok  SKILL.md counts match: ${facts.map((f) => `${f.n} ${f.what}`).join(", ")}`,
);
