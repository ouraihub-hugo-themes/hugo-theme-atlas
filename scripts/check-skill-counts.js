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

/** 模板里有没有 `class="… td-x …"` 形式的字面类名。 */
function hasLiteralClass(path) {
  return /\bclass="[^"]*(?<![-\w])td-/.test(readFileSync(path, "utf8"));
}

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

// ---- 「Finding a component's CSS classes」那一节 ----
//
// 这一节告诉读者「去读组件自己的模板，类名就在里面」，然后点名了做不到这件事的
// 那些 shortcode。名单错了的后果跟数字错了一样：读者去读一个没有类名的文件，
// 找不到就以为组件没有样式。所以名单也是断言，也要有东西看着。
//
// 判据就是这一节自己给出的那句话：模板里有没有 `class="… td-x …"`。有就是
// 「直接带字面量」，没有就必须出现在那三份名单之一里。

const SC = "layouts/_shortcodes";
const noLiteral = readdirSync(SC)
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.replace(".html", ""))
  .filter((n) => !hasLiteralClass(`${SC}/${n}.html`))
  .sort();

// 从 SKILL.md 里把三份名单抽回来：那一节的三个 bullet，每个开头是加粗的类别名。
const section = /## Finding a component's CSS classes\n([\s\S]*?)\n## /.exec(md)?.[1] ?? "";
if (!section) {
  bad.push("SKILL.md no longer has a 「Finding a component's CSS classes」 section");
} else {
  // 「Three kinds of shortcode do not:」之后到下一个空行为止，就是那三份名单。
  // 按 bullet 切而不是逐行匹配 —— 名单会折行，`^-` 在续行上匹配不到。
  const lists = /Three kinds of shortcode do not:\n\n([\s\S]*?)\n\n/.exec(section)?.[1] ?? "";
  const listed = new Set();
  for (const n of lists.matchAll(/`([a-z][a-z-]*)`/g)) listed.add(n[1]);
  const missing = noLiteral.filter((n) => !listed.has(n));
  const stale = [...listed].filter(
    (n) => readdirSync(SC).includes(`${n}.html`) && !noLiteral.includes(n),
  );
  if (missing.length) {
    bad.push(
      `SKILL.md 的类名一节没有交代 ${missing.join(", ")} —— ` +
        `它们的模板里没有字面类名，读者按那一节去读会落空`,
    );
  }
  if (stale.length) {
    bad.push(
      `SKILL.md 的类名一节把 ${stale.join(", ")} 列为「读不到类名」，` +
        `但它们的模板现在带了字面类名`,
    );
  }

  // 围栏那两个同理。
  const MK = "layouts/_markup";
  const fenceNoLiteral = readdirSync(MK)
    .filter((f) => f.startsWith("render-codeblock-"))
    .filter((f) => !hasLiteralClass(`${MK}/${f}`))
    .map((f) => f.replace("render-codeblock-", "").replace(".html", ""))
    .sort();
  const fenceClaim = /(\d+) of the (\d+)\s*\nfences carry their classes as literals/.exec(section);
  if (!fenceClaim) {
    bad.push("SKILL.md 不再声明有多少围栏直接带类名");
  } else {
    const total = count("layouts/_markup", "render-codeblock-");
    const want = total - fenceNoLiteral.length;
    if (Number(fenceClaim[1]) !== want || Number(fenceClaim[2]) !== total) {
      bad.push(
        `SKILL.md 说 ${fenceClaim[1]}/${fenceClaim[2]} 个围栏带字面类名，实际是 ${want}/${total}` +
          `（不带的是 ${fenceNoLiteral.join(", ")}）`,
      );
    }
  }
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
