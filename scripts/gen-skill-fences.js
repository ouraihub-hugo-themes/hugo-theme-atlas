// 从 codeblock render hook 生成 skill 的围栏语言参考页，兼门禁。
//
// 用法：node scripts/gen-skill-fences.js [--check]
//   --check 只比对不写：hook 改了而生成物没跟着更新时以非零退出。
//
// 为什么与 gen-skill-shortcodes.js 分开：源目录不同（`_markup/` 而不是
// `_shortcodes/`），事实的形状也不同 —— 围栏没有「成对还是自闭合」这件事，换成
// 「body 是什么格式」，而后者抽不出来。合成一个脚本会得到两套互不相干的分支。
//
// 这一份的公开面容易被整类漏掉：`filetree` 有文档页却不是 shortcode，模型会写成
// `{{< filetree >}}`，构建绿、页面上什么都没有。

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "layouts/_markup";
const OUT = "skills/hugo-theme-atlas/fences.md";
const PREFIX = "render-codeblock-";

// 普通代码围栏（任何语言）的属性，来自基础 hook。这不是某个语言专属的，所以
// 单独取。
const BASE_HOOK = "layouts/_markup/render-codeblock.html";

/**
 * `"allowed" (slice "a" "b")` → ["a","b"]；`"allowed" slice` → []。
 *
 * 两种写法都要认：`gallery` 用的是不带括号的空 slice（它不吃围栏属性，图的
 * 说明写在每一行上）。只认前一种会把它当成抽取失败。
 */
function allowed(text) {
  const at = text.indexOf('"allowed"');
  if (at < 0) return null;
  const rest = text.slice(at + '"allowed"'.length);

  // 空 slice：`"allowed" slice` 后面直接是下一个键或换行，没有 `(`。
  if (/^\s*slice\s*$/m.test(rest.split("\n")[0])) return [];

  const open = rest.indexOf("(slice");
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < rest.length; i += 1) {
    if (rest[i] === "(") depth += 1;
    else if (rest[i] === ")") {
      depth -= 1;
      if (depth === 0) {
        return [...rest.slice(open, i).matchAll(/"([^"]+)"/g)].map((x) => x[1]);
      }
    }
  }
  return null;
}

/**
 * 一句话英文说明 + body 是什么格式。**手写。**
 *
 * body 格式抽不出来 —— 它是每个 hook 自己解析的，形状写在文档注释里（中文）。
 * 而这恰恰是模型最需要的：属性名猜错只是少一个题注，body 格式猜错整块不出东西。
 * 每条的 `body` 都照 exampleSite 的实际写法抄，不照注释里的示例抄。
 */
const FENCES = {
  mermaid: {
    what: "Diagram rendered in the browser by Mermaid.",
    body: "Mermaid source, e.g. `graph LR` followed by edges.",
  },
  echarts: {
    what: "Chart rendered in the browser by Apache ECharts.",
    body: "A JSON ECharts option object.",
  },
  plantuml: {
    what: "UML diagram rendered server-side into a plain `<img>`.",
    body: "PlantUML source, e.g. `Alice -> Bob: request`. No `@startuml` wrapper needed.",
  },
  math: {
    what: "Display equation.",
    body:
      "LaTeX. Backslashes are safe here — inside `$$…$$` a `\\\\` is eaten once by the " +
      "Markdown parser, so the author has to write four; the fence has no such problem.",
  },
  chem: {
    what: "Chemical equation.",
    body: "mhchem notation, e.g. `CO2 + C -> 2 CO`. The `\\ce{}` wrapper is added for you.",
  },
  goat: {
    what: "ASCII diagram converted to SVG. No runtime, no network.",
    body: "ASCII art using `-`, `|`, `+`, `.`, `'`, and arrowheads.",
  },
  filetree: {
    what: "Directory tree with per-type icons.",
    body:
      "One path per line using box-drawing characters (`├──`, `│`, `└──`). " +
      "A `#` starts a trailing comment on that line.",
  },
  gallery: {
    what: "Grid of images.",
    body:
      "One Markdown image per line. A trailing `# caption` labels that image. " +
      "Attributes go on each line, not on the fence.",
  },
  checksums: {
    what: "Turn `sha*sum` output into a table of download links and checksums.",
    body: "One `<hash>  <filename>` pair per line, exactly as `sha256sum` prints it.",
  },
};

/**
 * 需要站点侧配置才有输出的围栏。只有一个，所以不建通用机制。
 *
 * 判据：`render-codeblock-plantuml.html` 是唯一引用 `params.ui.*` 的 hook。
 */
const NEEDS_CONFIG = {
  plantuml: {
    key: "params.ui.plantuml.server",
    without:
      "the fence renders its source as a plain code block instead of a diagram. " +
      "The theme ships no default server on purpose: pointing at a public one would send " +
      "every site's diagrams — possibly internal architecture — to a third party.",
  },
};

/** NEEDS_CONFIG 的判据，各自一个能在 hook 里查到的标记。 */
const NEEDS_CONFIG_PROOF = { plantuml: "params.ui.plantuml.server" };

const names = readdirSync(DIR)
  .filter((f) => f.startsWith(PREFIX) && f.endsWith(".html"))
  .map((f) => f.slice(PREFIX.length, -".html".length))
  .sort();

const specs = [];
const unknown = [];

for (const name of names) {
  const raw = readFileSync(join(DIR, PREFIX + name + ".html"), "utf8");
  const attrs = allowed(raw);

  if (attrs === null) {
    unknown.push(`${name}: no "allowed" attribute list found in the hook`);
  }
  if (!FENCES[name]) {
    unknown.push(`${name}: not described; add an entry to FENCES in this script`);
  }
  const proof = NEEDS_CONFIG_PROOF[name];
  if (proof && !raw.includes(proof)) {
    unknown.push(`${name}: NEEDS_CONFIG says it reads ${proof}, the hook no longer mentions it`);
  }
  // 反向：某个 hook 开始读 params.ui 了而这里没记。漏掉的后果是 skill 不告诉
  // 作者要配什么，而没配时那一块静默降级。
  if (!proof && /params\.ui\./.test(raw)) {
    unknown.push(`${name}: the hook reads params.ui.* but NEEDS_CONFIG has no entry for it`);
  }

  specs.push({ name, attrs: attrs ?? [], ...FENCES[name], needs: NEEDS_CONFIG[name] ?? null });
}

for (const [label, table] of [
  ["FENCES", FENCES],
  ["NEEDS_CONFIG", NEEDS_CONFIG],
  ["NEEDS_CONFIG_PROOF", NEEDS_CONFIG_PROOF],
]) {
  for (const name of Object.keys(table)) {
    if (!names.includes(name)) {
      unknown.push(`${label} has "${name}" but ${DIR}/${PREFIX}${name}.html does not exist`);
    }
  }
}

const baseAttrs = allowed(readFileSync(BASE_HOOK, "utf8"));
if (baseAttrs === null)
  unknown.push(`${BASE_HOOK}: could not extract the ordinary-fence attributes`);

// 共享属性策略：每个围栏在自己那张表之外，还一律接受 class / data-* / aria-*。
// 不写进生成物的话，模型会以为 `class=` 要另找地方加 —— 而它其实到处都能用。
// 判据是那条 warn 的措辞，它把这三样和各自的 allowed 拼在一起报出来。
const POLICY = "layouts/_partials/content/attributes.html";
const policySrc = readFileSync(POLICY, "utf8");
for (const marker of ['"data-"', '"aria-"', "class, data-*, aria-*"]) {
  if (!policySrc.includes(marker)) {
    unknown.push(`${POLICY}: the shared attribute policy no longer contains ${marker}`);
  }
}

if (unknown.length > 0) {
  for (const n of unknown) console.error(`FAIL  ${n}`);
  console.error(
    "\n抽取失败，不是 hook 的错就是这个脚本的模式过窄。两种都要改代码 —— 静默产出" +
      "一张短表会让模型以为那些属性不存在。",
  );
  process.exit(1);
}

const lines = [];
lines.push("# Fence languages");
lines.push("");
lines.push(
  "Generated from the codeblock render hooks by `scripts/gen-skill-fences.js`. Do not edit by " +
    "hand — `node scripts/gen-skill-fences.js --check` fails if this file drifts from them.",
);
lines.push("");
lines.push(
  "These are **not shortcodes.** Each is a fenced code block whose language name the theme " +
    "handles. This is one of the few mistakes here that fails loudly: `{{< mermaid >}}` stops " +
    'the build with `template for shortcode "mermaid" not found`.',
);
lines.push("");
lines.push("Attributes go in braces after the language name:");
lines.push("");
lines.push("````markdown");
lines.push('```mermaid {num="1" caption="Request lifecycle"}');
lines.push("graph LR");
lines.push("  A --> B");
lines.push("```");
lines.push("````");
lines.push("");
lines.push(
  "**Block attributes require `[markup.goldmark.parser.attribute] block = true` in the site " +
    "config.** Without it the brace line renders as body text. See `config.md`.",
);
lines.push("");
lines.push(
  "**Every fence also accepts `class`, `data-*`, and `aria-*`** on top of the attributes listed " +
    "per language below. An unlisted attribute is dropped with a warning and the block still " +
    "renders — verified: an unknown attribute warns `(allowed: caption, num, id, class, data-*, " +
    "aria-*)` and the diagram appears anyway.",
);
lines.push("");
lines.push("## Contents");
lines.push("");
for (const s of specs) lines.push(`- [${s.name}](#${s.name}) — ${s.what}`);
lines.push("- [Ordinary code fences](#ordinary-code-fences)");
lines.push("");

for (const s of specs) {
  lines.push(`## ${s.name}`);
  lines.push("");
  lines.push(s.what);
  lines.push("");
  lines.push(`**Body:** ${s.body}`);
  lines.push("");
  lines.push(
    s.attrs.length > 0
      ? `**Attributes:** ${s.attrs.map((a) => `\`${a}\``).join(", ")}`
      : "**Attributes:** none accepted on the fence itself.",
  );
  lines.push("");
  if (s.needs) {
    lines.push(`**Requires \`${s.needs.key}\` in the site config.** Without it ${s.needs.without}`);
    lines.push("");
  }
}

lines.push("## Ordinary code fences");
lines.push("");
lines.push("Any other language goes through the base hook, which accepts these attributes:");
lines.push("");
lines.push(`${baseAttrs.map((a) => `\`${a}\``).join(", ")}`);
lines.push("");
lines.push("````markdown");
lines.push('```go {filename="main.go" collapse="true"}');
lines.push("func main() {}");
lines.push("```");
lines.push("````");
lines.push("");
lines.push(
  "Syntax highlighting needs `[markup.highlight] noClasses = false` in the site config, or " +
    "code blocks keep light-mode colours in dark mode. See `config.md`.",
);

const out =
  lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";

if (process.argv.includes("--check")) {
  // 行尾统一成 LF 再比，否则只在作者机器上绿。
  const disk = existsSync(OUT) ? readFileSync(OUT, "utf8").replaceAll("\r\n", "\n") : "";
  if (disk !== out) {
    console.error(`FAIL  ${OUT} does not match the codeblock render hooks`);
    console.error("run: node scripts/gen-skill-fences.js");
    process.exit(1);
  }
  console.log(`ok  ${OUT} matches ${specs.length} fence languages`);
} else {
  writeFileSync(OUT, out);
  console.log(
    `wrote ${OUT}  ${specs.length} fence languages; ` +
      `${specs.filter((s) => s.needs).length} need site config; ` +
      `ordinary fences accept ${baseAttrs.length} attributes`,
  );
}
