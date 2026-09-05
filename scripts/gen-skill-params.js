// 从 params 消费方 partial 生成 skill 的 params.ui 参考页，兼门禁。
//
// 用法：node scripts/gen-skill-params.js [--check]
//
// 为什么需要这一份：端到端实测里，config.md 那张「可选参数」表只给了参数名，
// 没给形状。agent 于是把三个都猜错了 —— typography 猜成 map（真实是标量枚举）、
// comments 猜出一个不存在的 provider 键、openapi 整个没有文档只能去读源码。
// 前四个生成器覆盖内容写法，这一份覆盖站点配置。
//
// config.md 保持手写：那五个 markup 设置的「没有它会怎样」是实测叙述，不是能从
// 模板里抽出来的结构。这一份只管 params.ui.* 八棵树的键与枚举。

import { readFileSync, existsSync, writeFileSync } from "node:fs";

const OUT = "skills/hugo-theme-atlas/params.md";

const F = {
  share: "layouts/_partials/shell/share.html",
  typo: "layouts/_partials/typography-preset.html",
  shell: "layouts/_partials/shell/resolve.html",
  plantuml: "layouts/_partials/content/plantuml-server.html",
  comments: "layouts/_partials/shell/comments.html",
  openapi: "layouts/_partials/content/openapi-runtime.html",
  repo: "layouts/_partials/shell/edit-page.html",
  search: "layouts/_partials/shell/search.html",
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

/** 多行 `$allowed := slice "a" "b"` → ["a","b"]。 */
function allowedSlice(text) {
  const m = /\$allowed := slice((?:\s+"[a-z:_-]+")+)/.exec(text);
  return m ? [...m[1].matchAll(/"([a-z:_-]+)"/g)].map((x) => x[1]) : null;
}

/** validate-enum 调用里的 allowed 列表。 */
function enumOf(text) {
  const m = /"allowed" \(slice ((?:"[a-z]+" ?)+)\)/.exec(text);
  return m ? [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]) : null;
}

/** 给定正则的第一个捕获组里的字符串列表。`og:title` 这类带冒号的也要收进来。 */
function sliceAt(text, re) {
  const m = re.exec(text);
  return m ? [...m[1].matchAll(/"([a-z:_-]+)"/g)].map((x) => x[1]) : null;
}

const shareTargets = allowedSlice(src.share);
const typoValues = enumOf(src.typo);
const shellTypes = sliceAt(src.shell, /shell_types \| default \(slice ((?:"[a-z_]+" ?)+)\)/);
// plantuml 的枚举写在 warn 文本里而不是一个 slice 里，只能从那句话抽。
const plantumlFormats = /allowed: ([a-z]+), ([a-z]+)\)/.exec(src.plantuml)?.slice(1, 3) ?? null;
const commentsRequired = sliceAt(src.comments, /\$keys := slice ((?:"[a-z_]+" ?)+)/);
const commentsMapping = sliceAt(src.comments, /\$allowed := slice ((?:"[a-z:_-]+" ?)+)/);
if (commentsMapping?.length !== 6) {
  bad.push(`${F.comments}: expected six giscus mapping values, got ${commentsMapping}`);
}
const readingWidth = sliceAt(src.shell, /"allowed" \(slice ((?:"[a-z]+" ?)+)\)/);

// 页面级键。上一版这一段是手写的，而它把三个不存在的键当成页面键列了出来
// （`tone` 是 badge 的参数、`note` 是下载渠道的字段、`pem` 是 filetree 的扩展名），
// 还把 `featured_image` 当成图片路径。全部改成从消费方抽。
const F2 = {
  featured: "layouts/_partials/shell/featured.html",
  searchMarks: "layouts/_partials/search/resolve.html",
};
for (const [k, p] of Object.entries(F2)) {
  if (!existsSync(p)) {
    console.error(`FAIL  ${p} is gone; this generator's source moved`);
    process.exit(1);
  }
  src[k] = readFileSync(p, "utf8");
}

const featuredModes = sliceAt(src.featured, /"allowed" \(slice ((?:"[a-z]+" ?)+)\)/);
if (featuredModes?.length !== 4) {
  bad.push(`${F2.featured}: expected four featured_image modes, got ${featuredModes}`);
}
// 图源顺序写在文档注释里，是作者最需要而抽不出结构的一段，所以只钉住它还在。
if (!/名字像 featured \/ feature \/ cover \/ thumbnail/.test(src.featured)) {
  bad.push(`${F2.featured}: the page-resource name list changed; this page quotes it`);
}
const boostRange = /from (\d) to (\d)/.exec(src.searchMarks)?.slice(1, 3);
if (boostRange?.length !== 2) {
  bad.push(`${F2.searchMarks}: could not extract the search_boost range`);
}
if (!/search_exclude must be a boolean/.test(src.searchMarks)) {
  bad.push(`${F2.searchMarks}: search_exclude is no longer a boolean; this page says it is`);
}

if (!shareTargets?.length) bad.push(`${F.share}: could not extract the share target list`);
if (typoValues?.length !== 2) bad.push(`${F.typo}: expected two typography presets, got ${typoValues}`);
if (shellTypes?.length !== 4) bad.push(`${F.shell}: expected four default shell types, got ${shellTypes}`);
if (commentsRequired?.length !== 4) {
  bad.push(`${F.comments}: expected four required giscus keys, got ${commentsRequired}`);
}
if (!readingWidth?.length) bad.push(`${F.shell}: could not extract the reading_width enum`);
if (plantumlFormats?.length !== 2) {
  bad.push(`${F.plantuml}: expected two diagram formats, got ${plantumlFormats}`);
}

// openapi 的键从文档注释里的配置示例抽 —— 它是这一页唯一的来源，注释改了这里要跟。
// 两个渲染器块的键取并集 —— redoc 那块重复了 js/integrity，去重后才是「每渠道的键」。
const swaggerKeys = [
  ...new Set([...src.openapi.matchAll(/^\s{7}([a-z_]+) = "/gm)].map((m) => m[1])),
];
if (!swaggerKeys.includes("js") || !swaggerKeys.includes("css")) {
  bad.push(`${F.openapi}: could not extract the per-renderer keys from its config example`);
}
if (!/swagger: params\.ui\.openapi\.swagger\.css is required alongside js/.test(src.openapi)) {
  bad.push(`${F.openapi}: the "swagger needs css" rule is gone; this page states it`);
}
if (!/主题不打包 swagger-ui 与 redoc/.test(src.openapi)) {
  bad.push(`${F.openapi}: no longer states the runtimes are unbundled; this page says they are`);
}
// comments 的页面键例外：契约说「页面去掉 ui.」，comments 是唯一不适用的一处。
if (!/comments_off/.test(src.comments)) {
  bad.push(`${F.comments}: the page-level key is no longer comments_off; this page says it is`);
}
const repoKeys = [...src.repo.matchAll(/^\s{7}([a-z]+) = /gm)].map((m) => m[1]);
if (!repoKeys.includes("url")) bad.push(`${F.repo}: could not extract the repo keys`);
if (!/site\.Params\.ui\.search \| default false/.test(src.search)) {
  bad.push(`${F.search}: params.ui.search is no longer a plain boolean switch`);
}

if (bad.length > 0) {
  for (const n of bad) console.error(`FAIL  ${n}`);
  console.error(
    "\n抽取失败。配置形状猜错的后果是那个特性静默关着而构建是绿的，所以这一份" +
      "宁可门禁红，也不能产出一张不完整的表。",
  );
  process.exit(1);
}

const code = (a) => a.map((x) => `\`${x}\``).join(", ");
const L = [];

L.push("# `params.ui` reference");
L.push("");
L.push(
  "Generated from the partials that read these settings by `scripts/gen-skill-params.js`. Do " +
    "not edit by hand — `node scripts/gen-skill-params.js --check` fails if this file drifts.",
);
L.push("");
L.push(
  "`config.md` covers the five `markup` settings the theme cannot default. This page covers " +
    "the eight `params.ui.*` trees. **Every one of them fails silently when its shape is " +
    "wrong**: the feature stays off and the build stays green. Measured — an agent building a " +
    "site from these docs guessed the shape of three of them and got all three wrong.",
);
L.push("");
L.push("## The eight trees");
L.push("");
L.push("| Path | Shape |");
L.push("|---|---|");
L.push("| `params.ui.search` | bare boolean |");
L.push("| `params.ui.share` | list of target ids, **not** a boolean |");
L.push("| `params.ui.typography` | single string, one of an enum |");
L.push("| `params.ui.repo` | table |");
L.push("| `params.ui.comments` | table, all four keys or none |");
L.push("| `params.ui.openapi` | table of two per-renderer tables |");
L.push("| `params.ui.plantuml` | table |");
L.push("| `params.ui.shell_types` | list of type names |");
L.push("");
L.push("## `search`");
L.push("");
L.push("```toml");
L.push("[params.ui]");
L.push("search = true");
L.push("```");
L.push("");
L.push(
  "A bare boolean, off by default. Turning it on is not enough — the index is built by " +
    "`pagefind`, which the consumer runs after `hugo`. See `commands.md`.",
);
L.push("");
L.push("## `share`");
L.push("");
L.push(`**${shareTargets.length} targets:** ${code(shareTargets)}`);
L.push("");
L.push("```toml");
L.push("[params.ui]");
L.push('share = ["x", "bluesky", "linkedin", "email", "copy"]');
L.push("```");
L.push("");
L.push(
  "`share = true` warns and renders no bar — a boolean cannot say where to share to. An " +
    "unknown id drops that one entry and keeps the rest. On a page, `share: false` turns the " +
    "bar off, or a list overrides the site's.",
);
L.push("");
L.push("## `typography`");
L.push("");
L.push("```toml");
L.push("[params.ui]");
L.push(`typography = "${typoValues[0]}"`);
L.push("```");
L.push("");
L.push(
  `**A string, not a table.** One of ${code(typoValues)}; anything else warns and falls back ` +
    `to \`${typoValues[0]}\`. \`${typoValues[0]}\` uses the fonts the theme ships, ` +
    `\`${typoValues[1]}\` uses the platform stack. Both compile into the same stylesheet — ` +
    "neither loads a runtime.",
);
L.push("");
L.push("## `repo`");
L.push("");
L.push("```toml");
L.push("[params.ui.repo]");
L.push('url = "https://github.com/owner/repo"');
L.push('branch = "main"                  # default main');
L.push('subdir = ""                      # the site\'s subdirectory in the repo');
L.push('edit = "/edit/{branch}/{path}"    # only for a forge the default does not fit');
L.push("```");
L.push("");
L.push(`**Keys:** ${code(repoKeys)}. Only \`url\` matters — without it there is no edit link at`);
L.push(
  "all. It must be an absolute `http(s)` URL; a relative one warns and drops the link. The " +
    "default `edit` template fits GitHub, GitLab, and Gitea. On a page, `edit_page: false` " +
    "turns the link off for that page.",
);
L.push("");
L.push("## `comments`");
L.push("");
L.push("giscus, off until **completely** configured.");
L.push("");
L.push("```toml");
L.push("[params.ui.comments]");
L.push('repo = "owner/repo"');
L.push('repo_id = "R_..."');
L.push('category = "Announcements"');
L.push('category_id = "DIC_..."');
L.push("```");
L.push("");
L.push(
  `**All four of ${code(commentsRequired)} are required** and all four come from giscus.app. ` +
    "Configure some but not all and it warns and stays off. Configure none and it is simply " +
    "not enabled — no warning. `repo` is `owner/name`, not a URL.",
);
L.push("");
L.push("**There is no `provider` key.** The four keys go directly under");
L.push("`params.ui.comments`; a nested table named after the provider is silently ignored.");
L.push("");
L.push(
  `**Optional:** \`mapping\` (${code(commentsMapping ?? [])}, default \`pathname\`), \`term\`, ` +
    "`reactions`, `input_position` (`top` | `bottom`), `theme`, `lang`.",
);
L.push("");
L.push(
  "**This is the one documented exception to “page overrides drop the `ui.` prefix.”** The " +
    "page key is **`comments_off: true`**, not `comments`. The site-side `comments` is a table, " +
    "so sharing the name would make every page read that table where a boolean belongs and " +
    "warn `comments must be a boolean; got map[...]`. `comments_off` exists only on pages and " +
    "only turns comments off — `true` cannot turn them on, because that needs the four ids.",
);
L.push("");
L.push("## `openapi`");
L.push("");
L.push("Required by the `swagger` and `redoc` shortcodes. **Without it both render only a link");
L.push("to the spec** — a green build, no warning, and a container carrying the");
L.push("`data-td-openapi-unconfigured` attribute. That is an attribute, not a class, so");
L.push("`grep 'class=.*unconfigured'` finds nothing.");
L.push("");
L.push("```toml");
L.push("[params.ui.openapi.swagger]");
L.push('js = "https://cdn.example.com/swagger-ui-bundle.js"');
L.push('css = "https://cdn.example.com/swagger-ui.css"   # required alongside js');
L.push('integrity = "sha384-…"        # for js; strongly advised cross-origin');
L.push('css_integrity = "sha384-…"');
L.push("");
L.push("[params.ui.openapi.redoc]");
L.push('js = "https://cdn.example.com/redoc.standalone.js"');
L.push('integrity = "sha384-…"');
L.push("```");
L.push("");
L.push(`**Per-renderer keys:** ${code(swaggerKeys)}. \`redoc\` takes no \`css\`.`);
L.push("");
L.push(
  "**The theme bundles neither runtime** — swagger-ui and redoc are 1.5 MB and 1.1 MB, and " +
    "most sites have no API docs. The site self-hosts them or points at a CDN. This is a real " +
    "authoring cost, not an oversight: it is why the feature is off by default.",
);
L.push("");
L.push(
  "`swagger` needs `css` as well as `js`; supplying only `js` warns and the renderer stays " +
    "off. A cross-origin `js` without `integrity` warns and loads anyway. A malformed digest " +
    "warns and loads without it. Nothing here is downloaded at build time — the reader's " +
    "browser fetches it.",
);
L.push("");
L.push("## `plantuml`");
L.push("");
L.push("```toml");
L.push("[params.ui.plantuml]");
L.push('server = "https://www.plantuml.com/plantuml"   # or a self-hosted address');
L.push('format = "svg"');
L.push("```");
L.push("");
L.push(
  `Required by the \` \`\`\`plantuml \` fence, which renders its own source until this is set. ` +
    `\`format\` is ${code(plantumlFormats)}, default \`${plantumlFormats[0]}\`. \`server\` must ` +
    "be absolute `http(s)`.",
);
L.push("");
L.push(
  "**The theme ships no default server.** Pointing at a public one would send every site's " +
    "diagrams to a third party. Rendering happens in the reader's browser, not at build time.",
);
L.push("");
L.push("## `shell_types`");
L.push("");
L.push("```toml");
L.push("[params.ui]");
L.push(`shell_types = [${shellTypes.map((t) => `"${t}"`).join(", ")}]`);
L.push("```");
L.push("");
L.push(
  `The four reading shells — ${code(shellTypes)} — are the default. Set this only to extend ` +
    "the set: a `type` listed here gets the reading shell instead of the plain layout. " +
    "Replacing the list drops the defaults, so include them.",
);
L.push("");
L.push("## Page-level keys");
L.push("");
L.push(
  "Site-side `params.ui.<key>` pairs with a page-side `<key>` — the `ui.` prefix drops. Both " +
    "positions are looked up for these:",
);
L.push("");
L.push("| Page key | Site counterpart | Purpose |");
L.push("|---|---|---|");
L.push("| `share` | `params.ui.share` | `false` to turn the bar off, or a list to override |");
L.push("| `edit_page` | `params.ui.repo` | `false` to drop the edit link on this page |");
L.push("| `feedback` | `params.ui.repo` | `false` to drop the feedback widget |");
L.push("| `comments_off` | `params.ui.comments` | **the exception above** — page-only, `true` to turn off |");
L.push("");
L.push("");
L.push(
  "These four are read with Hugo's `.Param`, which checks the page and then the site's " +
    "**top-level** `params` — not `params.ui`:",
);
L.push("");
L.push("| Key | Shape |");
L.push("|---|---|");
L.push(`| \`reading_width\` | enum: ${code(readingWidth)} |`);
L.push(`| \`featured_image\` | enum: ${code(featuredModes)} — **a treatment, not a path** |`);
L.push(`| \`search_boost\` | whole number ${boostRange[0]}–${boostRange[1]}, a tier not a multiplier |`);
L.push("| `search_exclude` | boolean — `true` keeps the whole page out of the index |");
L.push("");
L.push(
  `**\`featured_image\` names the treatment, not the image.** It is one of ${code(featuredModes)}; ` +
    "a path warns and falls back. The image comes from the page's own `images` front-matter list, " +
    "or a page resource named `featured`, `feature`, `cover`, or `thumbnail`. A mode with no image " +
    "found renders nothing and does not warn — `images` often lives in site config or a cascade. " +
    "`featured_image_alt` supplies the alt text.",
);
L.push("");
L.push(
  "`search_boost` is a tier, not a multiplier: below " +
    `${boostRange[0]} it warns and uses ${boostRange[0]}, above ${boostRange[1]} it clamps. ` +
    "To drop a page entirely use `search_exclude`, not a zero boost — a non-boolean there warns " +
    "and keeps the page indexed.",
);

const out =
  L.join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";

if (process.argv.includes("--check")) {
  const disk = existsSync(OUT) ? readFileSync(OUT, "utf8").replaceAll("\r\n", "\n") : "";
  if (disk !== out) {
    console.error(`FAIL  ${OUT} does not match the partials that read these settings`);
    console.error("run: node scripts/gen-skill-params.js");
    process.exit(1);
  }
  console.log(`ok  ${OUT} matches the params.ui consumers`);
} else {
  writeFileSync(OUT, out);
  console.log(
    `wrote ${OUT}  ${shareTargets.length} share targets, ${typoValues.length} typography ` +
      `presets, ${commentsRequired.length} giscus keys, ${shellTypes.length} shell types`,
  );
}
