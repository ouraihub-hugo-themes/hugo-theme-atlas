// 从 data 消费方 partial 生成 skill 的数据文件参考页，兼门禁。
//
// 用法：node scripts/gen-skill-data.js [--check]
//
// 为什么需要这一份：端到端实测时，agent 能把「需要 data/contributors.yaml」这件事
// 说对，却把文件里的字段全猜错了 —— 它猜顶层直接放条目，真实是 `items:` 数组、
// `github` 必填。猜错的结果是那一节渲染不出来而构建是绿的，正是这份 skill 存在的
// 理由那一类失败。
//
// 前三个生成器覆盖的是「怎么调用」，这一份覆盖「被调用的东西要吃什么数据」。
// 少了它，前面那些 NEEDS_DATA 提示等于只说了一半。

import { readFileSync, existsSync, writeFileSync } from "node:fs";

const OUT = "skills/hugo-theme-atlas/data.md";

/** `$allowed := slice "a" "b"` → ["a","b"]，取指定文件里第 n 处（从 0 数）。 */
function allowedList(text, nth = 0) {
  const all = [...text.matchAll(/\$allowed := slice ((?:"[a-z_]+" ?)+)/g)];
  if (!all[nth]) return null;
  return [...all[nth][1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

/** `in (slice "a" "b")` 形式的枚举，取第一处。 */
function enumList(text) {
  const m = /in \(slice ((?:"[a-z]+" ?)+)\)/.exec(text);
  return m ? [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]) : null;
}

const F = {
  resolve: "layouts/_partials/download/resolve.html",
  channels: "layouts/_partials/download/channels.html",
  steps: "layouts/_partials/download/steps.html",
  contrib: "layouts/_partials/contributors/items.html",
};

const bad = [];
const src = {};
for (const [k, p] of Object.entries(F)) {
  if (!existsSync(p)) {
    console.error(`FAIL  ${p} is gone; this generator's source moved`);
    process.exit(1);
  }
  src[k] = readFileSync(p, "utf8");
}

// 顶层与渠道级白名单。抽不出来就停 —— 静默产出一张短表会让作者以为某个字段
// 不存在，而它写进去只会被 warn 掉。
const topKeys = allowedList(src.resolve);
const chanKeys = allowedList(src.channels);
// 渠道的白名单有两支：`$allowed` slice，加一条正则收 `title` / `note` 及其语言
// 后缀变体。只抽前者会产出一张缺 title 的表 —— 而 title 是必需的，缺了整个渠道
// 被跳过。实测里 agent 正是照着那张表发现它与页内示例自相矛盾的。
const chanSuffixed = /\^\(([a-z|]+)\)\(_\[a-z0-9_\]\+\)\?\$/.exec(src.channels)?.[1]?.split("|");
const stepKeys = [
  ...(src.steps.match(/in \(slice ((?:"[a-z_]+" ?)+)\)/)?.[1] ?? "").matchAll(/"([a-z_]+)"/g),
].map((m) => m[1]);
const kinds = enumList(src.channels);

if (!topKeys?.length) bad.push(`${F.resolve}: could not extract the top-level field list`);
if (!chanKeys?.length) bad.push(`${F.channels}: could not extract the channel field list`);
if (chanSuffixed?.length !== 2) {
  bad.push(`${F.channels}: expected two language-suffixed channel keys, got ${chanSuffixed}`);
}
if (!/title must resolve to a non-empty string; skipping the channel/.test(src.channels)) {
  bad.push(`${F.channels}: title is no longer required per channel; this page says it is`);
}
if (!stepKeys?.length) bad.push(`${F.steps}: could not extract the step field list`);
if (kinds?.length !== 2) bad.push(`${F.channels}: expected two channel kinds, got ${kinds}`);

// contributors 的形状：`items` 必填 + 每项的键写在文档注释的「返回」那行。
const contribItem = /返回：条目 slice，每项 ([a-z /]+)/
  .exec(src.contrib)?.[1]
  ?.split("/")
  .map((s) => s.trim())
  .filter(Boolean);
if (!contribItem?.length) {
  bad.push(`${F.contrib}: could not extract the per-item keys from its doc comment`);
}
if (!src.contrib.includes('isset .data "items"')) {
  bad.push(`${F.contrib}: no longer requires an "items" key; this page says it does`);
}
// `${version}` / `${tag}` 只有 pinned 能用 —— 这条是 agent 猜错的重点之一。
if (!/只有 pinned 能插值/.test(src.channels)) {
  bad.push(`${F.channels}: the pinned-only interpolation rule is no longer stated there`);
}
// published 的类型：实测里 agent 把它当发布日期写。判据是那条类型警告本身。
if (!/download published must be a boolean/.test(src.resolve)) {
  bad.push(`${F.resolve}: published is no longer type-checked as a boolean; this page says it is`);
}

if (bad.length > 0) {
  for (const n of bad) console.error(`FAIL  ${n}`);
  console.error(
    "\n抽取失败。数据文件的字段猜错的后果是那一块静默不出，所以这一份宁可门禁红，" +
      "也不能产出一张不完整的表。",
  );
  process.exit(1);
}

const code = (a) => a.map((x) => `\`${x}\``).join(", ");
const L = [];

L.push("# Data files");
L.push("");
L.push(
  "Generated from the partials that read them by `scripts/gen-skill-data.js`. Do not edit by " +
    "hand — `node scripts/gen-skill-data.js --check` fails if this file drifts from them.",
);
L.push("");
L.push(
  "Two components render **nothing at all** without a data file, and nothing with the wrong " +
    "keys. The build stays green either way. Measured: an agent told to build a site got the " +
    "file paths right and the field names wrong, and the sections silently vanished.",
);
L.push("");
L.push("## data/contributors.yaml");
L.push("");
L.push("Used by the `contributors` shortcode and the `contributors` landing section.");
L.push("");
L.push(
  "**The entries go under an `items:` key.** A file that lists them at the top level warns " +
    "`requires items; listing no contributors` and renders an empty wall.",
);
L.push("");
L.push("```yaml");
L.push("items:");
L.push("  - github: gohugoio # required");
L.push("    name: Hugo # optional, defaults to the handle");
L.push("    role: Static site generator # optional, hidden when absent");
L.push("    url: https://gohugo.io/ # optional, defaults to the GitHub profile");
L.push("    avatar: https://example.org/a.png # optional, defaults to an initial placeholder");
L.push("```");
L.push("");
L.push(`Per-entry keys: ${code(contribItem)}. Only \`github\` is required, and it must look like`);
L.push(
  "a GitHub handle — a bad one skips that entry and keeps the rest. The theme makes no network " +
    "call: avatars come from this file.",
);
L.push("");
L.push('A different filename works — `{{< contributors data="maintainers" >}}` reads');
L.push("`data/maintainers.yaml` — but the key must be a single top-level name, no slashes.");
L.push("");
L.push("## data/download/&lt;key&gt;.yaml");
L.push("");
L.push("Used by the `download` shortcode and the `download` landing section. The key is the");
L.push("filename, and it must match `^[a-z0-9][a-z0-9_-]*$`.");
L.push("");
L.push(`**Top-level fields:** ${code(topKeys)} — anything else skips the whole block.`);
L.push("`version` and `channels` are required; `channels` must be a non-empty array.");
L.push("`repo` is an `owner/repository` pair. `tag` defaults to `v` plus the version.");
L.push("");
L.push(
  "**`published` is a boolean, not a date.** It means “this version number is decided but the " +
    "release is not out yet”: `false` greys out the pinned channels. Next to a `version` and a " +
    "`tag` a date is the obvious reading and the wrong one — a date warns and is treated as `true`.",
);
L.push("");
L.push(`**Per-channel fields:** ${code(chanKeys)}, plus ${code(chanSuffixed)}.`);
L.push("");
L.push(
  `\`${chanSuffixed[0]}\` is **required** — a channel without one is skipped entirely. Both ` +
    `\`${chanSuffixed[0]}\` and \`${chanSuffixed[1]}\` accept a language suffix ` +
    `(\`${chanSuffixed[0]}_zh\`), which is why they are matched by pattern rather than listed ` +
    "in the whitelist.",
);
L.push("");
L.push(`\`kind\` is one of ${code(kinds)} and is what decides whether interpolation is allowed:`);
L.push("");
L.push(
  `- \`${kinds[1]}\` points at one specific version, so \`\${version}\` and \`\${tag}\` expand ` +
    "inside `steps[].code`.",
);
L.push(
  `- \`${kinds[0]}\` follows the latest release, so interpolation is refused — writing a fixed ` +
    "version into an “install the latest” command contradicts itself.",
);
L.push("");
L.push("`title` and `note` may never interpolate version facts, in any kind.");
L.push("");
L.push(`**Per-step fields:** ${code(stepKeys)}, plus \`title\` and \`title_<lang>\` variants.`);
L.push("");
L.push("```yaml");
L.push('version: "0.1.0"');
L.push("repo: owner/repository");
L.push("channels:");
L.push("  - id: tarball");
L.push(`    kind: ${kinds[1]}`);
L.push("    title: Source tarball");
L.push("    icon: box");
L.push("    steps:");
L.push("      - title: Download");
L.push("        lang: shell");
L.push("        code: curl -LO https://example.org/${tag}.tar.gz");
L.push("```");
L.push("");
L.push("Every one of these fields is validated. A bad value skips its own scope — the step, the");
L.push("channel, or the whole block — and warns. None of it fails the build.");

const out =
  L.join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";

if (process.argv.includes("--check")) {
  const disk = existsSync(OUT) ? readFileSync(OUT, "utf8").replaceAll("\r\n", "\n") : "";
  if (disk !== out) {
    console.error(`FAIL  ${OUT} does not match the partials that read the data files`);
    console.error("run: node scripts/gen-skill-data.js");
    process.exit(1);
  }
  console.log(`ok  ${OUT} matches the data-file schemas`);
} else {
  writeFileSync(OUT, out);
  console.log(
    `wrote ${OUT}  contributors: ${contribItem.length} per-entry keys; ` +
      `download: ${topKeys.length} top-level, ${chanKeys.length} per-channel, ${stepKeys.length} per-step`,
  );
}
