// 从 shortcode 模板生成 skill 的参数参考页，兼门禁。
//
// 用法：node scripts/gen-skill-shortcodes.js [--check]
//   --check 只比对不写：模板改了而生成物没跟着更新时以非零退出。
//
// 为什么生成而不是手写：30 个 shortcode 的公开面已经在模板里机器可读了 ——
// `validate-shortcode.html` 要靠它 warn 未知参数，所以每个模板都声明了自己的
// 参数白名单与调用形式。手写一份等于把同一事实抄第二遍，而抄本会漂移，且漂移
// 的表现是模型照着写出静默失效的参数名（Hugo 静默忽略认不出的参数）。
//
// 抽不出来的那部分明确留给手写，见 DESCRIPTIONS：模板头注释是中文，而 skill
// 是英文，翻译不能机械做。**注释里的调用示例不要照搬** —— `xref` 的注释写着
// `{{< xref fig="2.3" >}}`，而它读 `.InnerDeindent`，那样调用是硬错。生成的
// 事实（读不读 Inner）比注释可靠。

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "layouts/_shortcodes";
const OUT = "skills/hugo-theme-atlas/shortcodes.md";

// 把校验委托给别的 partial 的模板：在那份 partial 里找 allowed。
// 只有 OpenAPI 这一组这么做（两个渲染器共用一套参数契约）。
const DELEGATES = {
  redoc: "layouts/_partials/content/openapi-embed.html",
  swagger: "layouts/_partials/content/openapi-embed.html",
};

/**
 * 光有正确的调用还不够的那几个：还需要站点侧的文件或 front matter。
 *
 * 这一类抽不出来（依赖藏在 `hugo.Data` 索引与 `release/meta.html` 里），而漏掉
 * 它的后果最难查：调用完全正确、构建绿、页面上什么都没有 —— 因为事实缺席时
 * 模板有意什么都不渲染（渲染半个死链比不渲染更糟，见 release-card 的注释）。
 * 只有 4 条，手写，靠下面的断言看住它们仍然存在。
 */
const NEEDS = {
  contributors: "a `data/<key>.yaml` file in the site; the `data` parameter is that filename",
  download:
    "a `data/download/<key>.yaml` file in the site; the positional argument is that filename",
  "release-card": "`release_url` in the page front matter",
  "release-assets": "`release_url` in the page front matter, plus `sha*sum` output as the body",
};

/**
 * 需要站点侧 `params.ui.*` 才有完整输出的 shortcode。与 NEEDS 分开：缺数据是
 * 「什么都不出」，缺配置是「出一个降级的东西」—— 后者更难发现，因为页面上确实
 * 有块内容在。
 *
 * 端到端实测撞的就是这个：两个渲染器都只出了一个指向 spec 的链接，构建全绿，
 * 而 shortcodes.md 的条目里一个字没提要配 runtime 地址。
 */
const NEEDS_CONFIG = {
  swagger: {
    key: "params.ui.openapi.swagger",
    without:
      "it renders only a link to the spec, on a container carrying the `data-td-openapi-unconfigured` attribute (an attribute, not a class) — " +
      "no warning, green build. Needs both `js` and `css`. See `params.md`.",
  },
  redoc: {
    key: "params.ui.openapi.redoc",
    without:
      "it renders only a link to the spec, on a container carrying the `data-td-openapi-unconfigured` attribute (an attribute, not a class) — " +
      "no warning, green build. Needs `js`. See `params.md`.",
  },
};

/** NEEDS_CONFIG 的判据：那个 shortcode 确实走了 openapi runtime 解析。 */
const NEEDS_CONFIG_PROOF = { swagger: "openapi-embed.html", redoc: "openapi-embed.html" };

/**
 * 位置参数的语义。**手写** —— `"form" "positional"` 只说明它不收具名参数，
 * 参数是什么、能有几个，只写在模板的文档注释里（中文）。
 */
const POSITIONAL = {
  kbd: { shape: "Ctrl Shift P", note: "One argument per key, in order. Any number of keys." },
  param: {
    shape: "version",
    note: "Exactly one: the parameter name. Scalars only — maps and slices print nothing.",
  },
  download: { shape: "atlas", note: "Exactly one: the data filename without its extension." },
};

/**
 * 容器与它要求的子元素。
 *
 * 为什么必须单列：Hugo 只管「读了 Inner 就允许自闭合」，而容器自闭合是**语义
 * 上的错** —— `{{< cards />}}` 构建通过，渲染出一个空网格。`fields` 更明确，
 * 它 warn「requires at least one field child; rendering nothing」。模型看到
 * 「或者可以自闭合」就真会那么写，然后页面上什么都没有。
 *
 * 反过来 `fig` / `eq` 那种读 Inner 的不是容器：body 是任意内容，自闭合（只给
 * `src`）是正当用法。所以这张表不能靠「读不读 Inner」推。
 */
const CONTAINERS = {
  cards: "card",
  fields: "field",
  tabs: "tab",
  // body 同样是必需的，只是内容是 Markdown 而不是子 shortcode。自闭合一样得到
  // 一个空容器，所以它属于这一类；`child` 为 null 表示没有固定的子 shortcode。
  steps: null,
};

/** 子元素反查父容器，用来生成「必须被 X 包住」那句。 */
const CHILD_OF = { card: "cards", field: "fields", tab: "tabs" };

/**
 * 示例里显示哪些参数。默认取白名单前两个，对参数互斥的条目会教出错误用法。
 *
 * `xref` 的 `fig` / `tbl` / `eq` / `eg` 四选一，同时给两个会 warn 并只用第一个
 * （判据：`xref.html:22`）。只有这一个条目需要覆写。
 */
const SHOW = { xref: ["fig"] };

/**
 * 每个条目一条额外的、只能手写的事实。
 *
 * 判据是「模型读了上面那些机器生成的行仍然会做错的事」。目前两条：
 *
 * - `comment` 的 body 有意不渲染，`.Inner` 写在 `{{ if false }}` 里。不写这条
 *   的话，模型会以为注释掉的内容仍会被求值 —— 反过来，真去求值 Inner 的话，
 *   被注释掉的 `{{< fig >}}` 会照样占掉一个图号。
 * - `xref` 的常规用法是自闭合，成对只为自定义链接文字。模板的头注释示例写的是
 *   不成对形式，照抄会硬错（判据：exampleSite 里全是 `{{< xref fig="1" />}}`）。
 */
/**
 * 四张清单共用这一条：`page` 不只是「哪一页」的开关，它能指向另一个页面。
 *
 * 参数列表里光有个 `page` 看不出这个用法 —— 端到端实测里 agent 是读了模板注释
 * 才发现的。四个 shortcode 都是 5 行委派，行为在 book/figure-list.html 里。
 */
const listPage = (name) =>
  "`page` takes another page's path, not just this one's — " +
  `\`{{< ${name} page="/docs/fences" >}}\` lists that page's targets here. ` +
  "The partial forces the target page's `.Content` first, because Hugo does not guarantee " +
  "render order and an unrendered page has an empty registry.";

const NOTES = {
  comment:
    "The body is intentionally never rendered — shortcodes inside a comment do not run, so a " +
    "commented-out `fig` does not consume a figure number. Self-closing it is legal but pointless.",
  xref:
    'Normally self-closed: `{{< xref fig="1" />}}`. Pair it only to supply custom link text, ' +
    'as in `{{< xref fig="2" >}}see the figure above{{< /xref >}}`. ' +
    "`fig`, `tbl`, `eq`, and `eg` are mutually exclusive — pass exactly one, or use `anchor` " +
    "for an arbitrary fragment. `page` adds a cross-page target.",
  demo:
    "**Write the body in Hugo's escaped shortcode form** — `{{<` and `>}}` each wrapped in a " +
    "C-style comment. That escape being unescaped and then executed is the mechanism, not a " +
    "hazard: Hugo strips the markers during parsing, so `.InnerDeindent` already holds the " +
    "literal text. The rendered half runs that text as a real shortcode; the source half " +
    "highlights the same text through `transform.Highlight`, which no shortcode parser touches. " +
    "One input, two outputs, so the demo and its source cannot drift apart. " +
    "Nesting works — an escaped `cards` containing escaped `card` children renders as a real " +
    "grid above its own source. Plain fences work too, and stay visible in the source half. " +
    "In Markdown and other plain-text outputs only the source is emitted.",
  include:
    "**`file` resolves in three places, in order:** the page's own resources, then `assets/`, " +
    "then `content/`. A leading `/` means the content root and skips the first two; anything " +
    "else is relative to the current page's directory. Found in none of the three warns and " +
    "includes nothing.",
  cast:
    "`poster` and `start` are passed to the player verbatim — they take asciinema's own syntax " +
    "(`npt:1:23`, `data:text/plain,…`). The theme validates only that they contain no control " +
    "characters, so a malformed value reaches the player and fails there, not at build time.",
  "book-figures": listPage("book-figures"),
  "book-tables": listPage("book-tables"),
  "book-examples": listPage("book-examples"),
  "book-equations": listPage("book-equations"),
  "release-assets":
    "**`src` resolves in two places, in order:** the page's own resources, then `assets/`. " +
    "Unlike `include` there is no `content/` tier. Not found there warns and skips the block. " +
    "`src` and inner checksum lines are mutually exclusive.",
};

/**
 * 有更该用的写法的 shortcode。目前只有一条，所以不建通用机制。
 *
 * `steps` 的主路径是给有序列表标 `{.steps}` —— 那是真 `<ol>`，屏幕阅读器报
 * 「列表，N 项」，编号来自列表本身。`exampleSite` 里 `{{< steps >}}` 一次调用
 * 都没有，全走标记类。不写这一条，模型会默认用 shortcode 并交付一份可访问性
 * 更差的产物，而那种差别在渲染结果上看不出来。
 */
const PREFER = {
  steps: {
    instead:
      "Add `{.steps}` to an ordered list instead. That produces a real `<ol>`, so screen readers " +
      'announce "list, N items" and the numbering comes from the list itself.',
    when:
      "Use this shortcode only when a list cannot do the job: the step titles need to appear in " +
      "the table of contents, or a step has to contain a `%`-delimited container shortcode " +
      "(list indentation swallows those).",
  },
};

/**
 * NOTES 里那些「模板行为」断言的判据，各自一个能在模板里查到的标记。
 *
 * 手写的散文最容易悄悄变假：模板改了而这里的话还在。有判据的那几条，改了就门禁红。
 * `comment` 那条是端到端实测里被 agent 报错的一条（它说注释里的 shortcode 照样跑），
 * 实测证明模板是对的 —— 所以更要钉住它，下次改动就会被拦下。
 */
const NOTES_PROOF = {
  comment: "{{- if false }}{{ .Inner }}{{ end -}}",
  include: "页面资源 → assets → content/",
  cast: "poster 与 start 是播放器自己的语法",
  // 四张清单的判据是它们自己注释里那句「或 page= 指定的页」——「跨页」这件事
  // 就写在这五行里，删了或改了措辞都会红。委派目标换了人也会红。
  "book-figures": "或 page= 指定的页",
  "book-tables": "或 page= 指定的页",
  "book-examples": "或 page= 指定的页",
  "book-equations": "或 page= 指定的页",
  // 两档解析的判据就是那一行 or：加了 content/ 那一档它就变了。
  "release-assets": "(.Page.Resources.Get $src) (resources.Get $src)",
  // demo 的说明全靠「源码侧不走 Markdown」这一点。哪天有人把 transform.Highlight
  // 换成围栏加 RenderString，源码侧就会渲染成真组件，而这一页还在教对照展示。
  demo: "transform.Highlight $src $lang",
};

/** NEEDS 的判据，各自一个能在模板里查到的标记。 */
const NEEDS_PROOF = {
  contributors: "hugo.Data",
  download: "download/",
  "release-card": "release_url",
  "release-assets": "release_url",
};

/**
 * 去掉 Hugo 模板注释块，再做任何文本匹配。
 *
 * 必需：`comment.html` 的头注释里就写着 `.Inner` 在解释它为什么要留一句
 * `{{ if false }}{{ .Inner }}{{ end }}`。不剥注释的话，凡是注释里提到某个
 * 标记的模板都会被误判。这里恰好两种判法结论相同，但那是巧合。
 */
function strip(text) {
  return text.replaceAll(/\{\{-?\s*\/\*[\s\S]*?\*\/\s*-?\}\}/g, "");
}

/**
 * `"allowed" (slice "a" "b" …)` → ["a", "b"]。
 *
 * slice 可以跨行（`card.html` 就是），所以先抓 `(slice` 到配对右括号之间的
 * 整段再取字符串字面量。不用通用模板解析器：这是一个已知形状，为它引一个
 * 未知的失败面不值得。形状变了就抽不到，而抽不到会在下面以非零退出报出来。
 */
function allowed(text) {
  const at = text.indexOf('"allowed"');
  if (at < 0) return null;
  const open = text.indexOf("(slice", at);
  if (open < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  return [...text.slice(open, end).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** `"form" "positional"` → "positional"。没写就是 named（模板里的默认）。 */
function form(text) {
  const m = /"form"\s+"([a-z]+)"/.exec(text);
  return m ? m[1] : "named";
}

/** 读 Inner 决定调用形式：读了必须成对或自闭合，没读则不能带闭合标签。 */
function inner(text) {
  if (/\.InnerDeindent\b/.test(text)) return "InnerDeindent";
  if (/\.Inner\b/.test(text)) return "Inner";
  return null;
}

/**
 * 空 body 时模板是否明确警告并放弃渲染。
 *
 * 四个容器分两种：`fields` / `tabs` 有 "rendering nothing" 那条 warn，
 * `cards` / `steps` 没有，静默产出一个空容器。两种都是错的用法，但症状不同 ——
 * 前者能在构建日志里看到，后者只能在页面上看到。这个差别抽得出来，就不手写。
 */
function warnsWhenEmpty(text) {
  return /warnf[^}]*rendering nothing/.test(text);
}

/**
 * 非容器里「正文实际必需」的那条警告 → 一句话，或 null。
 *
 * `inner()` 只说模板读了 `.Inner`，也就是自闭合语法合法。合法不等于有用：
 * `field` / `eg` / `tbl` 自闭合是合法调用，但每次都 warn 并丢掉自己。端到端实测里
 * agent 照着「成对或自闭」写了个自闭的 `field`，拿到的是一条警告和一张空表。
 *
 * 判据是结构而不是措辞：绑定到 trim 过的 `.InnerDeindent` 的变量，守卫里判它为空，
 * 块内 warn 且后果是丢掉自己。曾按措辞枚举（"inner table content" 那一串），漏了
 * `eq` 的 "TeX content" 与 `mindmap` 的 "a nested list as its body" —— 两个都在
 * 文档里被写成「或自闭合」，而实测两个都 warn。仓里这类「缺正文」的措辞有十九种，
 * 白名单必然继续漂。
 *
 * 按后果过滤：`xref` 也有一条「缺正文」的警告，但它回退到用锚点当链接文字，那是
 * 可用的调用形式，不该写成「正文必需」。守卫条件里带 `or` 的是 `fig` 那种二选一。
 */
function bodyRequired(text) {
  const bind = /(\$\w+)\s*:=\s*strings\.TrimSpace \(printf "%s" \.InnerDeindent\)/.exec(text);
  if (!bind) return null;
  const guard = new RegExp(
    `if ([^\\n]*not[^\\n]*\\${bind[1]}\\b[^\\n]*?)-?\\}\\}\\s*\\r?\\n\\s*\\{\\{-? warnf "[^"]*? at %s; ([a-z][^"]*?)" `,
  ).exec(text);
  if (!guard) return null;
  const [, cond, drop] = guard;
  if (!/^(rendering nothing|skipping this field)$/.test(drop)) return null;
  if (/\bor\b/.test(cond)) return "src-or-body";
  return drop === "skipping this field" ? "skips itself" : "renders nothing";
}

/**
 * 参数之间的依赖与互斥 → [{ what, drops }]。
 *
 * 两条，都是实测暴露的：`include` 的 `lang requires code=true`（写了 lang 没写
 * code 就静默不高亮），`release-assets` 的 `base is only valid without release_url`
 * （文档把两者并列列出，同时给则整张表消失）。
 *
 * 只收「参数 A 与参数 B 的关系」那一类，不收单参数的取值校验 —— 后者已经在
 * enums 与 bools 里。
 */
function deps(text) {
  const out = [];
  const re =
    /warnf "shortcode %q: ([a-z_]+ (?:requires [a-z_]+=?[a-z]*|is only valid [^"]*?)) at %s; ([^"]+)"/g;
  for (const m of text.matchAll(re)) {
    if (!out.some((x) => x.what === m[1])) out.push({ what: m[1], drops: m[2] });
  }
  return out;
}

/**
 * 走 `validate-bool.html` 的参数名。
 *
 * 为什么要单独标出来：`callForm` 的占位符一律印 `name="…"`，而 `…` 对布尔参数是
 * 错的示范。实测里 agent 照着 `code="…"` 写了 `code="toml"` —— 而 `code="true"`
 * 恰好能用，所以错的心智模型不会被纠正，下一次它会写 `copy="yes"`。
 *
 * 两种写法都收：单个 `validate-bool` 调用，以及 `$bools := slice` 那种批量的。
 */
function bools(text) {
  const out = new Set();
  for (const m of text.matchAll(/validate-bool\.html" \(dict\s*\n?\s*"value" \(\.Get "([a-z_]+)"/g)) {
    out.add(m[1]);
  }
  for (const m of text.matchAll(/\$bools := slice ((?:"[a-z_]+" ?)+)/g)) {
    for (const n of m[1].matchAll(/"([a-z_]+)"/g)) out.add(n[1]);
  }
  return [...out];
}

/**
 * 正文必须用 `{{% %}}` 而不是 `{{< >}}` 调用。
 *
 * 判据：模板把 `.Inner` 原样输出（前后留空行给 Goldmark 看块边界），而不是过
 * `render-block`。`{{< >}}` 不让正文过 Markdown，于是 `### 标题` 变成页面上的
 * 字面量 —— 零警告、exit 0。
 *
 * 端到端实测里这是最贵的一条：生成物对 30 个 shortcode 一律印 `{{< >}}`，
 * 而 `steps` 照着写出来的是一堆字面量文本。exampleSite 里 `{{% steps %}}` 是
 * 整个示例站唯一的 `%` 调用，所以「照抄示例」也救不了。
 */
function needsPercent(text) {
  // 通用形状而不是写死 `td-steps`：`{{ .Inner }}` 独占一行、前后空行、且模板
  // 全篇不调 render-block。第二个这样的 shortcode 出现时要自动被认出来。
  if (/partial "content\/render-block\.html"/.test(text)) return false;
  return /\n\s*\n\{\{ \.Inner \}\}\s*\n\s*\n/.test(text);
}

/**
 * 正文是否走 `content/render-block.html`（内部就是 `RenderString`）。
 *
 * 后果是 Hugo 的 shortcode 转义在这些正文里失效：外层渲染把注释标记去掉，内层
 * RenderString 再看到的就是一个真的 shortcode 调用，于是它执行了。端到端实测里
 * 这是唯一一条造成硬构建失败的缺口，而这四个容器恰好是「展示示例」用的。
 *
 * 抽而不手写：哪几个走二次渲染完全取决于模板里有没有那句 partial 调用。
 * `eq` 正文进 KaTeX 不进 Markdown，所以它不在这一集里 —— 这个区别只有抽取能保证。
 */
function rerenders(text) {
  return /partial "content\/render-block\.html"/.test(text);
}

/** `validate-enum` 的 allowed + fallback，只有 badge 用到。 */
function enums(text) {
  const out = [];
  for (const m of text.matchAll(
    /partial\s+"validate-enum\.html"\s+\(dict([\s\S]{0,400}?)\)\s*-?\}\}/g,
  )) {
    const body = m[1];
    const key = /"key"\s+"([^"]+)"/.exec(body);
    const values = allowed(body);
    if (key && values) out.push({ key: key[1], values });
  }
  return out;
}

/**
 * 一句话英文说明。**手写，不是翻译产物。**
 *
 * 模板头注释是中文，skill 是英文，机械搬不过来。也不要照搬注释里的调用示例 ——
 * `xref` 的注释写着 `{{< xref fig="2.3" >}}`，而它读 Inner，那样调用是硬错。
 *
 * 少一条就非零退出（见下），所以加 shortcode 的人必须在这里写一句。
 */
const DESCRIPTIONS = {
  badge: "Inline status badge.",
  "book-equations": "List of every numbered equation on the page, in source order.",
  "book-examples": "List of every numbered example on the page, in source order.",
  "book-figures": "List of every numbered figure on the page, in source order.",
  "book-tables": "List of every numbered table on the page, in source order.",
  "book-toc": "Table of contents for the current section.",
  card: "One card in a grid. Must be wrapped in `cards`.",
  cards: "Grid container for `card`. Takes no parameters of its own.",
  cast: "Terminal session recording from an asciicast file.",
  comment: "Author note kept in the source and dropped from the output.",
  demo: "Component example: the rendered result above, its copyable source below.",
  contributors: "Contributor avatar wall built from a local data file. Makes no network requests.",
  download: "Download section with per-channel install instructions, built from a data file.",
  eg: "Numbered example. Caption on top, body is usually one or more code fences.",
  eq: "Numbered equation. Body is LaTeX.",
  field: "One field definition. Must be wrapped in `fields`.",
  fields: "Definition list of `field` children.",
  fig: "Numbered figure. Either `src` for an image, or a body for arbitrary block content.",
  include: "Pull in another file: a page resource, an assets mount, or another content file.",
  kbd: "Key sequence, rendered with separators and a screen-reader-only reading.",
  mindmap: "Mind map drawn in the browser from a nested Markdown list body.",
  param: "Print a page parameter, falling back to site config. Scalars only.",
  redoc: "Render an OpenAPI document with Redoc (three-column, read-only).",
  "release-assets": "Turn `sha*sum` output into a table of download links and checksums.",
  "release-card": "Release card: version, date, and four links derived from `release_url`.",
  steps: "Numbered steps driven by headings in the body.",
  swagger: 'Render an OpenAPI document with Swagger UI (includes the "try it" panel).',
  tab: "One tab inside `tabs`.",
  tabs: "Tab group.",
  tbl: "Numbered table. Body is a Markdown table.",
  xref: "Cross-reference to a numbered target or an anchor, with a language-correct label.",
};

const names = readdirSync(DIR)
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.slice(0, -".html".length))
  .sort();

const specs = [];
const unknown = [];

for (const name of names) {
  const raw = readFileSync(join(DIR, name + ".html"), "utf8");
  const body = strip(raw);
  let params = allowed(body);
  let via = null;

  if (params === null && DELEGATES[name]) {
    via = DELEGATES[name];
    params = allowed(strip(readFileSync(via, "utf8")));
  }

  const spec = {
    name,
    form: form(body),
    params,
    via,
    inner: inner(body),
    enums: enums(body),
    needs: NEEDS[name] ?? null,
    warnsWhenEmpty: warnsWhenEmpty(body),
    bodyRequired: bodyRequired(body),
    rerenders: rerenders(body),
    needsConfig: NEEDS_CONFIG[name] ?? null,
    percent: needsPercent(raw),
    bools: bools(body),
    deps: deps(body),
  };

  // NEEDS 是手写的，所以要证明它说的那个依赖还在。模板改成不读数据了而这里
  // 还在要求作者建文件，是一条会让人白忙的假指令。
  const proof = NEEDS_PROOF[name];
  if (proof && !raw.includes(proof))
    unknown.push(`${name}: NEEDS says it reads ${proof}, template no longer mentions it`);

  // NOTES 里的行为断言同理 —— 判据在 raw 上找，因为其中一条本身就是文档注释。
  const noteProof = NOTES_PROOF[name];
  if (noteProof && !raw.includes(noteProof)) {
    unknown.push(`${name}: NOTES describes behaviour the template no longer has (${noteProof})`);
  }

  const cfgProof = NEEDS_CONFIG_PROOF[name];
  if (cfgProof && !raw.includes(cfgProof)) {
    unknown.push(`${name}: NEEDS_CONFIG says it goes through ${cfgProof}, it no longer does`);
  }
  // 反向：开始读 params.ui 了而这里没记。漏掉的后果是作者不知道要配什么，
  // 而没配时那一块降级成一个看起来像内容的东西 —— 比什么都不出更难发现。
  if (!cfgProof && /params\.ui\./.test(raw)) {
    unknown.push(`${name}: reads params.ui.* but NEEDS_CONFIG has no entry for it`);
  }

  // 归不到任何一类的才是漏抽。具名参数必须有白名单；positional / none 本来
  // 就没有。这条是这个生成器唯一的失败模式，所以它必须响 —— 不会失败的检查
  // 不算检查。
  if (spec.form === "named" && spec.params === null) {
    unknown.push(`${name}: named params but no "allowed" whitelist found`);
  }
  if (!DESCRIPTIONS[name]) {
    unknown.push(`${name}: no English description; add one to DESCRIPTIONS in this script`);
  }
  if (spec.form === "positional" && !POSITIONAL[name]) {
    unknown.push(
      `${name}: positional form but no argument shape; add one to POSITIONAL in this script`,
    );
  }
  // 容器必须读 Inner。反了就是这张手写表跟模板脱节了 —— 而它一脱节，生成的
  // 「Always paired」那句就在教一个会硬错的用法。
  if (CONTAINERS[name] && !spec.inner) {
    unknown.push(`${name}: CONTAINERS lists it, but the template does not read the body`);
  }
  // SHOW 里写错一个名字，生成的示例就会教一个不存在的参数 —— 正是这份文件存在
  // 的理由所要防的那件事。
  for (const p of SHOW[name] ?? []) {
    if (!(spec.params ?? []).includes(p)) {
      unknown.push(`${name}: SHOW names "${p}", which is not in the template's allowed list`);
    }
  }
  specs.push(spec);
}

// 反向：手写的三张表里有模板已经不存在的条目。删 shortcode 时这里会响。
for (const [label, table] of [
  ["DESCRIPTIONS", DESCRIPTIONS],
  ["POSITIONAL", POSITIONAL],
  ["NEEDS", NEEDS],
  ["CONTAINERS", CONTAINERS],
  ["CHILD_OF", CHILD_OF],
  ["PREFER", PREFER],
  ["NOTES", NOTES],
  ["NOTES_PROOF", NOTES_PROOF],
  ["NEEDS_CONFIG", NEEDS_CONFIG],
  ["NEEDS_CONFIG_PROOF", NEEDS_CONFIG_PROOF],
  ["SHOW", SHOW],
]) {
  for (const name of Object.keys(table)) {
    if (!names.includes(name))
      unknown.push(`${label} has "${name}" but ${DIR}/${name}.html does not exist`);
  }
}

if (unknown.length > 0) {
  for (const n of unknown) console.error(`FAIL  ${n}`);
  console.error(
    "\n抽取失败，不是模板的错就是这个脚本的模式过窄。两种都要改代码，" +
      "不要靠让它静默产出一张短表混过去 —— 短表会让模型以为那些参数不存在。",
  );
  process.exit(1);
}

/**
 * 调用形式一行说清。这是整份表里最要紧的一列 —— 混用是硬构建错误，而模型没有
 * 别的办法知道某个 shortcode 读不读 Inner。
 */
function callForm(s) {
  // 用真实参数名当占位，不写 `key="value"`：模型会照着抄，抄一个不存在的名字
  // 出来的正是本文件要防的那种静默失效。取前两个，够看出形状。
  // 取前两个参数当占位对大多数条目都对，但对参数互斥的不对。只有 xref 这一个，
  // 所以给一张覆写表而不是建通用的互斥声明机制。
  const shown = SHOW[s.name] ?? (s.params ?? []).slice(0, 2);
  // 布尔参数印 `="true"`，不印 `="…"`：后者是在教一个会静默失效的值。
  const ph = (p) => `${p}="${s.bools.includes(p) ? "true" : "…"}"`;
  const attrs =
    s.form === "named" && shown.length > 0
      ? " " + shown.map(ph).join(" ")
      : s.form === "positional"
        ? " " + POSITIONAL[s.name].shape
        : "";
  if (s.inner) {
    // `%` 分隔符的那几个：正文原样交给 Goldmark，用 `<` 会把 Markdown 变字面量。
    const [o, c] = s.percent ? ["{{%", "%}}"] : ["{{<", ">}}"];
    const paired = `\`${o} ${s.name}${attrs} ${c}\` … \`${o} /${s.name} ${c}\``;
    if (s.percent) {
      return [
        `${paired} — **\`%\` delimiters, not \`<\`.**`,
        "With `{{<` the body is not parsed as Markdown: headings and code fences render as",
        "literal text, with no warning and a green build. Leave a blank line above and below the",
        "body so Goldmark sees block boundaries.",
      ].join(" ");
    }
    // `in` 而不是取值判真：steps 的值是 null（没有固定子 shortcode），但它同样
    // 必须成对。
    if (s.name in CONTAINERS) {
      const child = CONTAINERS[s.name];
      const empty = s.warnsWhenEmpty
        ? "an empty body warns and renders nothing"
        : "an empty body renders an empty container and says nothing";
      const wraps = child ? `, wrapping one or more \`${child}\`` : "";
      return [`${paired}${wraps}.`, `Always paired — ${empty}.`].join(" ");
    }
    const selfClosed = `\`{{< ${s.name}${attrs} />}}\``;
    // 「或自闭合」只在自闭合真的可用时说。对正文必需的那几个，自闭合是合法语法
    // 但每次都 warn —— 写成并列的两个选项，作者会挑短的那个。
    if (s.bodyRequired === "src-or-body") {
      return [
        `${paired}, **or** ${selfClosed} with \`src\`.`,
        "The body and `src` are the two content sources and are mutually exclusive — but the",
        "`src` form still needs the closing slash. `{{< " + s.name + ' src="…" >}}` with neither',
        "a body nor a `/` is a build error, not a shorthand.",
      ].join(" ");
    }
    if (s.bodyRequired) {
      return [
        `${paired} — the body is required.`,
        `Syntactically ${selfClosed} is legal, but it warns and ${s.bodyRequired} every time.`,
        "Every call must be closed or self-closed; a bare opening tag is a build error.",
      ].join(" ");
    }
    return [
      `${paired} — **or** self-closed ${selfClosed}.`,
      "Every call in a page must be closed or self-closed; a bare opening tag is a build error.",
    ].join(" ");
  }
  return `\`{{< ${s.name}${attrs} >}}\` — never closed. Adding \`{{< /${s.name} >}}\` is a build error.`;
}

const lines = [];
lines.push("# Shortcode reference");
lines.push("");
lines.push(
  "Generated from the templates by `scripts/gen-skill-shortcodes.js`. Do not edit by hand — " +
    "`node scripts/gen-skill-shortcodes.js --check` fails if this file drifts from them.",
);
lines.push("");
lines.push("Two rules cause most build failures, and neither is guessable from a call site:");
lines.push("");
lines.push(
  "1. **A misspelled parameter does not fail the build.** The theme warns and names the allowed " +
    "parameters, then ignores the value — so `titel=` for `title=` leaves the build green and the " +
    "title simply absent. Build with `--panicOnWarning` to turn that into a failure. " +
    "Only the names listed below exist.",
);
lines.push(
  "2. **Paired vs unpaired is fixed per shortcode, and getting it wrong fails the build.** " +
    "Each entry below states which form it takes. Two exact errors, both verified:",
);
lines.push("");
lines.push(
  "   - Closing one that takes no body: " +
    '`shortcode "badge" does not evaluate .Inner or .InnerDeindent, yet a closing tag was provided`',
);
lines.push(
  "   - Leaving one that takes a body unclosed: " +
    '`shortcode "card" must be closed or self-closed`',
);
lines.push("");
lines.push(
  "A third failure is silent: self-closing a container. `{{< cards />}}` builds with no warning at " +
    'all and renders `<div class="td-cards"></div>` — an empty grid.',
);
lines.push("");
lines.push("## Contents");
lines.push("");
for (const s of specs) lines.push(`- [${s.name}](#${s.name}) — ${DESCRIPTIONS[s.name]}`);
lines.push("");

for (const s of specs) {
  lines.push(`## ${s.name}`);
  lines.push("");
  lines.push(DESCRIPTIONS[s.name]);
  lines.push("");
  lines.push(callForm(s));
  lines.push("");

  if (s.form === "named" && s.params && s.params.length > 0) {
    lines.push(`Parameters: ${s.params.map((p) => `\`${p}\``).join(", ")}`);
    if (s.via) lines.push(`(validated in \`${s.via}\`, shared with the other OpenAPI renderer)`);
    if (s.bools.length > 0) {
      lines.push("");
      lines.push(
        `Boolean: ${s.bools.map((p) => `\`${p}\``).join(", ")} — takes \`true\` or \`false\`, ` +
          "nothing else. Any other value warns and falls back to `false`.",
      );
    }
    if (s.deps.length > 0) {
      lines.push("");
      lines.push("**Parameters that depend on each other:**");
      lines.push("");
      for (const d of s.deps) lines.push(`- \`${d.what}\` — otherwise: ${d.drops}`);
    }
    lines.push("");
  } else if (s.form === "positional") {
    lines.push(`Positional, not named. ${POSITIONAL[s.name].note}`);
    lines.push("Named parameters are rejected and warned about, not rendered.");
    lines.push("");
  } else if (s.form === "none") {
    lines.push("Takes no parameters.");
    lines.push("");
  }

  for (const e of s.enums) {
    lines.push(`\`${e.key}\` must be one of ${e.values.map((v) => `\`${v}\``).join(", ")}.`);
    lines.push("");
  }

  if (NOTES[s.name]) {
    lines.push(NOTES[s.name]);
    lines.push("");
  }

  if (PREFER[s.name]) {
    lines.push(`**Not the primary path.** ${PREFER[s.name].instead}`);
    lines.push("");
    lines.push(PREFER[s.name].when);
    lines.push("");
  }

  if (CHILD_OF[s.name]) {
    lines.push(
      `Only valid inside \`${CHILD_OF[s.name]}\`. On its own it renders outside the layout it needs.`,
    );
    lines.push("");
  }

  // demo 例外：对它来说「转义被摘掉再执行」正是工作原理，不是陷阱。它自己的
  // NOTES 条目说明这件事，这里再印一遍通用警告会互相矛盾。
  if (s.rerenders && s.name !== "demo") {
    const where = s.name in CONTAINERS ? `a \`${s.name}\` child's body` : `a \`${s.name}\` body`;
    lines.push(
      `**This body is rendered in a second pass**, so Hugo's \`{{</* … */>}}\` escape does not ` +
        `survive it. An escaped shortcode inside ${where} is unescaped by the outer render and ` +
        "then executed by the inner one — it runs, warns about its own deliberate mistakes, and " +
        "under `--panicOnWarning` fails the build.",
    );
    lines.push("");
    // 「改用围栏」曾经写在上面那段里，是错的：Hugo 在 Goldmark 之前展开
    // shortcode，围栏和行内代码都不构成保护，围栏里的 `{{< cards />}}` 会渲染成
    // 一个真的空栅格。二次渲染的 body 里唯一能得到字面文本的写法是双层转义，
    // 但它把 `/*` `*/` 留在页面上，并不干净 —— 展示写法请用 `demo`。
    lines.push(
      "To show shortcode syntax as text, use `demo` — it prints the source next to the " +
        "rendered result. A fence does **not** protect shortcode syntax anywhere on a page: " +
        "Hugo expands shortcodes before Goldmark sees the fence.",
    );
    lines.push("");
  }

  if (s.needs) {
    lines.push(`**Also requires:** ${s.needs}`);
    lines.push("Without it the shortcode renders nothing at all — the build still succeeds.");
    lines.push("");
  }

  if (s.needsConfig) {
    lines.push(
      `**Requires \`${s.needsConfig.key}\` in the site config.** Without ${s.needsConfig.without}`,
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
  // 行尾统一成 LF 再比。磁盘上是 LF（.gitattributes），拼出来的也是 LF，但读回
  // 来的那份在 CRLF 检出下会带 \r —— 不归一化的话只在作者机器上绿。
  const disk = existsSync(OUT) ? readFileSync(OUT, "utf8").replaceAll("\r\n", "\n") : "";
  if (disk !== out) {
    console.error(`FAIL  ${OUT} does not match the shortcode templates`);
    console.error("run: node scripts/gen-skill-shortcodes.js");
    process.exit(1);
  }
  console.log(`ok  ${OUT} matches ${specs.length} shortcode templates`);
} else {
  writeFileSync(OUT, out);
  const inners = specs.filter((s) => s.inner).length;
  console.log(
    `wrote ${OUT}  ${specs.length} shortcodes: ` +
      `${inners} take a body, ${specs.length - inners} do not; ` +
      `${specs.filter((s) => s.needs).length} need site-side data`,
  );
}
