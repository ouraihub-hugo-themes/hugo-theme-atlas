// 从 landing section partial 生成 skill 的 landing 参考页，兼门禁。
//
// 用法：node scripts/gen-skill-landing.js [--check]
//   --check 只比对不写：partial 改了而生成物没跟着更新时以非零退出。
//
// 与前两个生成器分开的理由同上：源目录不同，事实的形状也不同。landing 有**两层**
// 允许键 —— section 自己的（`landing/keys.html`）和每项的（`landing/items.html`）
// —— 而 shortcode 与围栏都只有一层。
//
// 这一份覆盖的是另一类任务：作者在编 `content/landing/index.md` 的 front matter，
// 不是在正文里写调用。漏一个必需字段的表现是那一项被静默跳过，构建绿。

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "layouts/_partials/landing/section";
const OUT = "skills/hugo-theme-atlas/landing.md";
const KEYS = "layouts/_partials/landing/keys.html";
const RESOLVE = "layouts/_partials/landing/resolve.html";

/**
 * 取 `"allowed" (slice "a" "b")` 里的字面量。
 *
 * `from` 是起点偏移：一个 section 文件里有两处 `"allowed"`（keys 一处、items 一处），
 * 要按调用点分别取，不能只认第一处。
 */
function allowedAt(text, from = 0) {
  const at = text.indexOf('"allowed"', from);
  if (at < 0) return null;
  const open = text.indexOf("(slice", at);
  if (open < 0 || open - at > 40) return null;
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) {
        return [...text.slice(open, i).matchAll(/"([^"]+)"/g)].map((x) => x[1]);
      }
    }
  }
  return null;
}

/** 某个 partial 调用点之后的第一处 allowed。调用点找不到就返回 null。 */
function allowedAfter(text, call) {
  const at = text.indexOf(call);
  return at < 0 ? null : allowedAt(text, at);
}

/**
 * 必需字段 → 漏了以后什么后果。
 *
 * 措辞**不**统一，所以正则收紧到分号结尾的单个键名：`pricing-compare` 有一条
 * `requires a non-empty plans array`，宽松的模式会把 `a` 当成键名抽出来。宁可漏抽
 * 一条散文式的警告，也不能凭空造一个不存在的键 —— 模型会照着写。
 *
 * 后果只有两种（实测 22 : 4）：`skipping it` 只丢那一项，`rendering nothing` 整节
 * 不出。这个区别对作者是两种完全不同的排查路径，所以跟着键名一起抽。
 */
function required(text) {
  const out = [];
  for (const m of text.matchAll(/requires ([a-z_]+); (skipping it|rendering nothing)/g)) {
    if (!out.some((x) => x.key === m[1])) out.push({ key: m[1], drops: m[2] });
  }
  return out;
}

/**
 * 一句话英文说明。**手写**，理由同前两个生成器：模板头注释是中文，而 skill 是英文。
 *
 * 只写「它是什么 / 什么时候选它」。字段名一律从模板抽，不在这里重复 —— 重复一遍
 * 就是第二处会漂的地方。
 */
const SECTIONS = {
  hero: "Page-opening headline block. One per page, first in the array.",
  cards: "Grid of linked cards. Same markup as the `card` shortcode.",
  capabilities: "Feature list with a per-row status marker.",
  principles: "Short titled statements with an icon. No links.",
  steps: "Numbered narrative steps. Landing's own, unrelated to `{.steps}` in content.",
  metrics: "Big-number stats with labels.",
  "bar-chart": "Horizontal bars from label/value pairs. No chart runtime.",
  timeline: "Dated entries in order, each with an optional status.",
  faq: "Question and answer pairs.",
  testimonials: "Pull quotes with attribution.",
  "logo-wall": "Row of logos, optionally linked.",
  gallery: "Image grid. Landing's own, unrelated to the `gallery` fence.",
  pricing: "Plan cards with price, features, and actions.",
  "pricing-compare": "Feature-by-plan comparison table.",
  cta: "A band of action buttons and nothing else.",
  "case-study": "One narrative case with an image and its own metrics.",
  "code-plate": "A single code sample presented as a section.",
  "command-box": "Copyable command lines.",
  preview: "One framed screenshot.",
  markdown: "An escape hatch: a block of Markdown as its own section.",
  contributors: "Avatars from a data file.",
  download: "Install instructions from a data file.",
};

/** 需要 `data/<key>.yaml` 的 section，键名 → 默认值。判据是模板里的 default。 */
const NEEDS_DATA = { contributors: "contributors", download: "download" };

/**
 * 措辞是散文式、`required()` 接不住的必需项。**手写，但带判据。**
 *
 * `pricing-compare` 那条是 `requires a non-empty plans array; rendering nothing` ——
 * 「非空」比「有这个键」更准（空数组和缺键是两种输入），而 `tests/invalid/landing.md`
 * 锁着这句原话。所以不动模板、不放宽正则，改成在这里补一条并附一个能在模板里查到的
 * 标记：措辞一改，门禁就响。
 *
 * 漏抽的后果是模型以为 `plans` 可选，而漏了它整节不出。
 */
const PROSE_REQUIRED = {
  "pricing-compare": {
    proof: "requires a non-empty plans array",
    keys: ["plans"],
    drops: "rendering nothing",
    note: "must be a non-empty array — an empty one counts as missing",
  },
};

const names = readdirSync(DIR)
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.slice(0, -".html".length))
  .sort();

const bad = [];
const specs = [];

for (const name of names) {
  const raw = readFileSync(join(DIR, name + ".html"), "utf8");
  const keys = allowedAfter(raw, "landing/keys.html");
  const items = allowedAfter(raw, "landing/items.html");

  if (keys === null) bad.push(`${name}: no landing/keys.html allowed list found`);
  if (!SECTIONS[name]) bad.push(`${name}: not described; add an entry to SECTIONS in this script`);
  if (NEEDS_DATA[name] && !raw.includes('"data"')) {
    bad.push(`${name}: NEEDS_DATA says it takes a data key, the partial no longer allows one`);
  }
  // 反向：开始吃 data 键了而这里没记。漏掉的后果是 skill 不说要建数据文件，
  // 而没建时整节静默不出。
  if (!NEEDS_DATA[name] && keys?.includes("data")) {
    bad.push(`${name}: allows a data key but NEEDS_DATA has no entry for it`);
  }

  const prose = PROSE_REQUIRED[name];
  if (prose && !raw.includes(prose.proof)) {
    bad.push(`${name}: PROSE_REQUIRED quotes "${prose.proof}", the partial no longer warns that`);
  }
  // 反向：散文式必需项只认已登记的键。登记了模板里不存在的键，等于凭空造一个。
  for (const k of prose?.keys ?? []) {
    if (!keys?.includes(k)) bad.push(`${name}: PROSE_REQUIRED names "${k}", not an allowed key`);
  }

  specs.push({
    name,
    what: SECTIONS[name],
    keys: keys ?? [],
    items,
    required: required(raw),
    prose: prose ?? null,
    data: NEEDS_DATA[name] ?? null,
    actions: (keys ?? []).includes("actions"),
  });
}

for (const [label, table] of [
  ["SECTIONS", SECTIONS],
  ["NEEDS_DATA", NEEDS_DATA],
  ["PROSE_REQUIRED", PROSE_REQUIRED],
]) {
  for (const k of Object.keys(table)) {
    if (!names.includes(k)) bad.push(`${label} has "${k}" but ${DIR}/${k}.html does not exist`);
  }
}

// 公共键与 tone 取值从各自的所有者抽，不手写 —— 它们是 22 个 section 共用的，
// 手写一份就是加一处会漂的地方。
const commonKeys = [...readFileSync(KEYS, "utf8").matchAll(/\$common := slice ((?:"[a-z]+" ?)+)/g)]
  .flatMap((m) => [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]))
  .filter((k, i, a) => a.indexOf(k) === i);
if (commonKeys.length === 0) bad.push(`${KEYS}: could not extract the common key list`);

const tones = allowedAt(readFileSync(RESOLVE, "utf8"));
if (!tones?.length) bad.push(`${RESOLVE}: could not extract the tone enum`);

const ACTIONS = "layouts/_partials/landing/actions.html";
const actionKeys = [
  ...readFileSync(ACTIONS, "utf8").matchAll(/\$allowed := slice ((?:"[a-z]+" ?)+)/g),
].flatMap((m) => [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]));
if (actionKeys.length === 0) bad.push(`${ACTIONS}: could not extract the action item keys`);

if (bad.length > 0) {
  for (const n of bad) console.error(`FAIL  ${n}`);
  console.error(
    "\n抽取失败，不是 partial 的错就是这个脚本的模式过窄。两种都要改代码 —— 静默产出" +
      "一张短表会让模型以为那些键不存在，而它写出来的 front matter 会被静默跳过。",
  );
  process.exit(1);
}

const code = (a) => a.map((x) => `\`${x}\``).join(", ");
const lines = [];

lines.push("# Landing sections");
lines.push("");
lines.push(
  "Generated from the landing section partials by `scripts/gen-skill-landing.js`. Do not edit " +
    "by hand — `node scripts/gen-skill-landing.js --check` fails if this file drifts from them.",
);
lines.push("");
lines.push(
  "A landing page is **front matter, not body content.** There are no shortcodes here. The page " +
    "is `layout: landing` plus a `sections:` array, and each entry's `type` picks the section.",
);
lines.push("");
lines.push("```yaml");
lines.push("---");
lines.push("title: Home");
lines.push("layout: landing");
lines.push("sections:");
lines.push("  - type: hero");
lines.push("    headline: Ship documentation that stays correct");
lines.push("    tagline: Because the build will not tell you when it is not.");
lines.push("  - type: cards");
lines.push("    title: Start here");
lines.push("    items:");
lines.push("      - title: Install");
lines.push("        href: /docs/install/");
lines.push("---");
lines.push("```");
lines.push("");
lines.push(
  "**An unknown key warns and is ignored. A missing required key drops that item — or the " +
    "whole section — while the build stays green.** Each section below states which.",
);
lines.push("");
lines.push(`**Every section also accepts** ${code(commonKeys)}.`);
lines.push("");
lines.push(
  `\`tone\` is one of ${code(tones)}; anything else warns and falls back to \`${tones[0]}\`. ` +
    "`title` and `subtitle` render Markdown; `eyebrow` is plain text.",
);
lines.push("");
lines.push(
  `Sections carrying \`actions\` take a list of buttons, each keyed ${code(actionKeys)}. ` +
    "`style` is one of `primary`, `secondary`, `text`.",
);
lines.push("");
lines.push("## Contents");
lines.push("");
for (const s of specs) lines.push(`- [${s.name}](#${s.name}) — ${s.what}`);
lines.push("");

for (const s of specs) {
  lines.push(`## ${s.name}`);
  lines.push("");
  lines.push(s.what);
  lines.push("");
  lines.push(
    s.keys.length > 0
      ? `**Section keys:** ${code(s.keys)}`
      : "**Section keys:** none of its own; the shared keys above are all it takes.",
  );
  lines.push("");
  if (s.items) {
    lines.push(`**Each entry in \`items\`:** ${code(s.items)}`);
    lines.push("");
  }
  if (s.required.length > 0) {
    const drop = s.required.filter((r) => r.drops === "skipping it").map((r) => r.key);
    const kill = s.required.filter((r) => r.drops === "rendering nothing").map((r) => r.key);
    if (drop.length > 0)
      lines.push(`**Required per entry:** ${code(drop)} — omit one and that entry is skipped.`);
    if (kill.length > 0)
      lines.push(`**Required:** ${code(kill)} — omit one and the whole section renders nothing.`);
    lines.push("");
  }
  if (s.prose) {
    const tail =
      s.prose.drops === "rendering nothing" ? "the whole section renders nothing" : "it is skipped";
    lines.push(`**Required:** ${code(s.prose.keys)} — ${s.prose.note}, and ${tail}.`);
    lines.push("");
  }
  if (s.data) {
    lines.push(
      `**Needs a data file.** The \`data\` key names a top-level file under \`data/\`, ` +
        `defaulting to \`data/${s.data}.yaml\`. Without that file the section renders nothing.`,
    );
    lines.push("");
  }
}

const out =
  lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";

if (process.argv.includes("--check")) {
  // 行尾统一成 LF 再比，否则只在作者机器上绿。
  const disk = existsSync(OUT) ? readFileSync(OUT, "utf8").replaceAll("\r\n", "\n") : "";
  if (disk !== out) {
    console.error(`FAIL  ${OUT} does not match the landing section partials`);
    console.error("run: node scripts/gen-skill-landing.js");
    process.exit(1);
  }
  console.log(`ok  ${OUT} matches ${specs.length} landing sections`);
} else {
  writeFileSync(OUT, out);
  console.log(
    `wrote ${OUT}  ${specs.length} sections; ` +
      `${specs.filter((s) => s.items).length} take items; ` +
      `${specs.filter((s) => s.data).length} need a data file`,
  );
}
