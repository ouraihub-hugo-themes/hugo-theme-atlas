// 从 src/css/theme.css 生成 skill 的 token 参考页，兼门禁。
//
// 用法：node scripts/gen-skill-tokens.js [--check]
//
// 为什么需要这一份：换外观是这个主题最常见的定制需求，而 131 个 token 一处都没
// 穷举过 —— README 只给了三个示例。对照 shadcn-svelte 的 theming 页（同一种
// clone-and-own 分发），它把变量名全列出来，并把「用变量就不必去改类名」写成
// 设计目标。这一份补的是同一层。
//
// 最容易搞错的一件事：站点作者该覆盖的是 `--td-*`，不是 `--color-*`。后者是
// `@theme inline` 里的映射，只喂 Tailwind 的 utility 生成；组件 CSS 大量直接读
// `--td-*`。改错那一层的表现是「一部分变了一部分没变」，构建照常绿。

import { readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** src/ts 下所有 .ts，递归。 */
function tsFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) tsFiles(p, out);
    else if (e.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

const SRC = "src/css/theme.css";
const OUT = "skills/hugo-theme-atlas/tokens.md";
const css = readFileSync(SRC, "utf8");

/** 取一个块的正文：`selector {` 到配平的 `}`。 */
function block(re) {
  const m = re.exec(css);
  if (!m) return null;
  let depth = 1;
  let i = m.index + m[0].length;
  const from = i;
  while (i < css.length && depth > 0) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") depth -= 1;
    i += 1;
  }
  return css.slice(from, i - 1);
}

/** 块里声明的自定义属性名，按出现顺序，去重。 */
function names(text) {
  if (text == null) return [];
  const out = [];
  for (const m of text.matchAll(/^\s*(--[a-z0-9-]+):/gm)) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

const rootBody = block(/^:root \{/m);
const darkBody = block(/^\[data-td-theme="dark"\] \{/m);
const typoBody = block(/^\[data-td-typography="system"\] \{/m);
const inlineBody = block(/^@theme inline \{/m);
const constBody = block(/^@theme \{/m);

const bad = [];
if (rootBody == null) bad.push(`${SRC}: :root 块不见了`);
if (inlineBody == null) bad.push(`${SRC}: @theme inline 块不见了`);
if (constBody == null) bad.push(`${SRC}: @theme 块不见了`);
if (bad.length) {
  for (const b of bad) console.error(`FAIL  ${b}`);
  process.exit(1);
}

const root = names(rootBody);
const dark = names(darkBody);
const typo = names(typoBody);
const constants = names(constBody);

// 映射：Tailwind 名 → 它背后的 --td-* 名。
const mapping = [];
for (const m of inlineBody.matchAll(/^\s*(--[a-z0-9-]+):\s*var\((--[a-z0-9-]+)\)/gm)) {
  mapping.push({ tw: m[1], td: m[2] });
}
if (mapping.length === 0) bad.push(`${SRC}: @theme inline 里一条 var() 映射也没抽到`);

// utility 前缀 → 它生成什么类名。Tailwind 的约定，不是本主题的。
const UTILITY = {
  "--color-": "`bg-*` `text-*` `border-*`",
  "--font-": "`font-*`",
  "--shadow-": "`shadow-*`",
  "--leading-": "`leading-*`",
  "--radius-": "`rounded-*`",
  "--duration-": "`duration-*`",
  "--ease-": "`ease-*`",
};

function utilityFor(name) {
  for (const [p, cls] of Object.entries(UTILITY)) if (name.startsWith(p)) return cls;
  return null;
}

// 每个映射项都该能说出它生成哪一族 utility —— 说不出就是前缀表该更新了。
const unknown = mapping.filter((m) => !utilityFor(m.tw)).map((m) => m.tw);
if (unknown.length) {
  bad.push(
    `${SRC}: @theme inline 里 ${unknown.join(", ")} 的前缀不在 UTILITY 表里；` +
      `Tailwind 会为它生成什么类名要写进这个脚本`,
  );
}
if (bad.length) {
  for (const b of bad) console.error(`FAIL  ${b}`);
  process.exit(1);
}

const mapped = new Set(mapping.map((m) => m.td));
const unmapped = root.filter((n) => !mapped.has(n));

// 谁在读 -emphasis、谁在运行时改写量度 —— 从消费方抽，不叙述。
// 两者都做反向断言：抽空了说明来源结构变了，那时这一页会静默地少说一件事。
const cssFiles = readdirSync("src/css").filter((f) => f.endsWith(".css"));
const emphasisUsers = cssFiles
  .filter((f) => f !== "theme.css")
  .filter((f) => /--td-status-[a-z]+-emphasis/.test(readFileSync(`src/css/${f}`, "utf8")));
if (emphasisUsers.length === 0) {
  bad.push("src/css: 没有一个组件样式表读 --td-status-*-emphasis；这一页声称有，判据要改");
}

// 运行时会变的量度有两个来源：JS 写（setProperty），和媒体查询里重声明。
// 后者是本主题实际用的手法 —— print 把 chrome 高度归零，宽断点换侧栏宽度。
const tsSrc = tsFiles("src/ts")
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");
const jsWritten = unmapped.filter((n) =>
  new RegExp(`setProperty\\(\\s*["'\`]${n}["'\`]`).test(tsSrc),
);

const mediaOverridden = [];
for (const f of cssFiles) {
  const src = readFileSync(`src/css/${f}`, "utf8");
  for (const m of src.matchAll(/@media ([^{]+)\{([\s\S]*?)\n\}/g)) {
    for (const n of unmapped) {
      if (new RegExp(`^\\s*${n}:`, "m").test(m[2]) && !mediaOverridden.some((x) => x.token === n)) {
        mediaOverridden.push({ token: n, at: m[1].trim() });
      }
    }
  }
}

// 没进 @theme inline 的 --td-* 分三组，判据是名字本身而不是手写名单。
// 顺序即优先级：先按后缀，再按前缀。
const GROUPS = [
  { id: "emphasis", test: (n) => n.endsWith("-emphasis") },
  { id: "font", test: (n) => n.startsWith("--td-font-") },
  { id: "metric", test: () => true },
];
const grouped = Object.fromEntries(GROUPS.map((g) => [g.id, []]));
for (const n of unmapped) grouped[GROUPS.find((g) => g.test(n)).id].push(n);

// 每组都得非空 —— 空了说明 theme.css 的结构变了，这一页的分组叙述跟着失效。
for (const g of GROUPS) {
  if (grouped[g.id].length === 0) {
    bad.push(`${SRC}: 没有一个 --td-* 落进「${g.id}」组；这一页按三组叙述，结构变了要改这里`);
  }
}
if (bad.length) {
  for (const b of bad) console.error(`FAIL  ${b}`);
  process.exit(1);
}

const L = [];
L.push("# Theme tokens");
L.push("");
L.push(`Generated from \`${SRC}\` by \`scripts/gen-skill-tokens.js\`. Do not edit.`);
L.push("");
L.push(
  "Restyling this theme means setting a custom property, not overriding a class. There is " +
    "one token layer — no preprocessor variables — so the same name works in light mode, " +
    "dark mode, print, and forced colors.",
);
L.push("");
L.push("## Set `--td-*`, not `--color-*`");
L.push("");
L.push(
  `\`--color-*\`, \`--font-*\`, and \`--shadow-*\` are **mappings** — ${mapping.length} of them, ` +
    "declared in `@theme inline` so that Tailwind generates utility classes. Component CSS " +
    "reads the underlying `--td-*` directly.",
);
L.push("");
L.push(
  "So setting `--color-accent` changes what `bg-accent` paints and leaves every component " +
    "reading `--td-accent` untouched. The page half-changes and the build stays green. " +
    "**Set the `--td-*` name.**",
);
L.push("");
L.push("```css");
L.push("/* your own stylesheet, loaded after the theme's */");
L.push(":root {");
L.push("  --td-accent: oklch(0.55 0.19 250);");
L.push("  --td-shell-sidebar-w: 20rem;");
L.push("}");
L.push("");
L.push('[data-td-theme="dark"] {');
L.push("  --td-accent: oklch(0.72 0.15 250);");
L.push("}");
L.push("```");
L.push("");

const darkSet = new Set(dark);

// :root 里写成 `--td-a: var(--td-b);` 的纯别名。深色只改了 b 时 a 自动跟随，
// 所以 Dark 列要把这种间接标出来 —— 否则作者以为漏了一个，去补一份多余的覆盖。
const alias = new Map();
for (const m of rootBody.matchAll(/^\s*(--td-[a-z0-9-]+):\s*var\((--td-[a-z0-9-]+)\)\s*;/gm)) {
  alias.set(m[1], m[2]);
}

/** 这个 token 在深色下是否会变，以及为什么。 */
function darkCell(name) {
  if (darkSet.has(name)) return "✓";
  const via = alias.get(name);
  if (via && darkSet.has(via)) return `via \`${via}\``;
  return "";
}

L.push("## Tokens with a utility alias");
L.push("");
L.push(
  "Set the left column. The Tailwind column is the alias to use when you are writing markup " +
    "instead of CSS: `--color-*` generates `bg-*` / `text-*` / `border-*`, `--font-*` generates " +
    "`font-*`, `--shadow-*` generates `shadow-*`.",
);
L.push("");
L.push(
  "**Dark** is what happens in dark mode. `✓` means " +
    '`[data-td-theme="dark"]` re-declares it, so your override needs to appear in both blocks. ' +
    "`via …` means it is an alias and dark mode already follows through it — override the named " +
    "token instead. Blank means the one value serves both modes.",
);
L.push("");
L.push("| Token | Tailwind | Dark |");
L.push("|---|---|---|");
for (const m of mapping) {
  L.push(`| \`${m.td}\` | \`${m.tw}\` | ${darkCell(m.td)} |`);
}
L.push("");

L.push("## Tokens with no utility alias");
L.push("");
L.push(
  "These are read straight out of CSS or JS, so no class name reaches them. Setting the " +
    "related `--color-*` does nothing for them.",
);
L.push("");
L.push(
  `- **Status emphasis** (${grouped.emphasis.length}) — ` +
    grouped.emphasis.map((n) => `\`${n}\``).join(", ") +
    `. Read by ${emphasisUsers.map((f) => `\`${f}\``).join(", ")}. Each status carries two ` +
    "values: the plain one draws borders and icons, `-emphasis` draws text. They are separate " +
    "because a hue tuned for a 1px border does not hold enough contrast as text on a pale " +
    "fill. Recolour a status and you want both.",
);
L.push(
  `- **Layout metrics** (${grouped.metric.length}) — ` +
    grouped.metric.map((n) => `\`${n}\``).join(", ") +
    ". Lengths, not colours." +
    (jsWritten.length
      ? ` The browser bundle rewrites ${jsWritten.map((n) => `\`${n}\``).join(", ")} at runtime.`
      : "") +
    (mediaOverridden.length
      ? " Some are re-declared in a media query, so the `:root` value is a default rather than " +
        "a constant: " +
        mediaOverridden.map((x) => `\`${x.token}\` at \`${x.at}\``).join(", ") +
        ". Override them at the same breakpoint or the default wins there."
      : ""),
);
L.push(
  `- **Font roles** (${grouped.font.length}) — ` +
    grouped.font.map((n) => `\`${n}\``).join(", ") +
    ". The platform stacks are the fallback tail behind every other font role; keep them last " +
    "in any list you write, since CJK, emoji, and glyphs missing from Inter render from there.",
);
L.push("");

L.push("## Design constants");
L.push("");
L.push(
  "Declared in `@theme` rather than `:root`, and not tied to any `--td-*`. They do not change " +
    "with the colour scheme.",
);
L.push("");
L.push("| Token | Utility |");
L.push("|---|---|");
for (const n of constants) L.push(`| \`${n}\` | ${utilityFor(n) ?? "—"} |`);
L.push("");
L.push(
  "The three `--duration-*` values are how `prefers-reduced-motion` is honoured: that media " +
    "query zeroes all three instead of maintaining a per-selector list. If you add an animation, " +
    "drive its duration from one of them and reduced motion works for free.",
);
L.push("");

if (typo.length) {
  L.push("## Typography preset");
  L.push("");
  L.push(
    '`[data-td-typography="system"]` re-declares ' +
      typo.map((n) => `\`${n}\``).join(", ") +
      ", dropping the fonts the theme ships in favour of platform stacks. Both presets compile " +
      "into one stylesheet with no runtime. Select it with `params.ui.typography` — see " +
      "`params.md`.",
  );
  L.push("");
}

L.push("## Two things that will not work");
L.push("");
L.push(
  "- **Do not edit `assets/dist/`.** It is generated; the next `pnpm css:build` overwrites it. " +
    "Theme sources live in `src/css/`.",
);
L.push(
  "- **A token only JS reads does not belong in `@theme`.** Tailwind tree-shakes names that no " +
    "class references, and `getComputedStyle` then returns an empty string. Put it in a plain " +
    "`:root` block — which is where the `--td-*` layout metrics above already live.",
);

const out =
  L.join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";

if (process.argv.includes("--check")) {
  const disk = existsSync(OUT) ? readFileSync(OUT, "utf8").replaceAll("\r\n", "\n") : "";
  if (disk !== out) {
    console.error(`FAIL  ${OUT} does not match ${SRC}`);
    console.error("run: node scripts/gen-skill-tokens.js");
    process.exit(1);
  }
  console.log(`ok  ${OUT} matches ${SRC}`);
} else {
  writeFileSync(OUT, out);
  console.log(
    `wrote ${OUT}  ${mapping.length} aliased tokens, ${unmapped.length} direct-read, ` +
      `${constants.length} constants, ${dark.length} dark overrides`,
  );
}
