// 非 HTML 输出格式的结构断言。
//
// Hugo 的 render hook 按输出格式查找，`.html` 那份**不回落**到其他格式。少一个
// 变体时 Goldmark 用它自己的默认渲染，作者写的属性原样进输出 —— 于是同一个
// `{style=...}` 在 HTML 里被属性策略丢弃并 warn，在 RSS 里活着输出。这类回归
// 是静默的：构建绿的，warn 也照常出（那条 warn 只对 HTML 成立），只有去读
// index.xml 才看得见。
//
// 因此这里建一个真站点、读真输出。用例内容内联在下面而不是放进 exampleSite：
// 那一份是发布门禁的站点，一页故意写坏属性会让门禁永远红着。

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const THEME = process.cwd();

// 六类页面各一份，用来证明 `data-pagefind-body` 覆盖到每一类。
//
// 漏标一类的表现是**那一类页面整体搜不到**，而构建全绿、页面看起来正常 ——
// 只有去建索引才发现少了一批。四个壳共用一份 baseof，所以正常情况下它们一起
// 中标或一起漏标；但 `shell_types` 之外的 type 走另一支，landing 与首页也在
// 那一支，那才是真正会漏的地方。
const SHELLS = ["docs", "book", "blog", "swagger"];

// 一页两张表：第一张带被策略丢弃的属性与 caption，第二张是 matrix。
const PAGE = `---
title: outputs
date: 2026-01-01
---

| a | b |
| - | - |
| 1 | 2 |
{onclick="alert(1)" style="color:red" caption="cap" id="t1"}

| m | n |
| - | - |
| r | v |
{.matrix}
`;

const site = mkdtempSync(join(tmpdir(), "atlas-out-"));
const failures = [];

try {
  mkdirSync(join(site, "content", "feed"), { recursive: true });
  writeFileSync(join(site, "content", "feed", "tables.md"), PAGE);

  // 四个壳各一页 + 一个 landing + 一个普通单页。首页由 hugo.toml 的站点标题生成，
  // 不用写内容文件。
  for (const shell of SHELLS) {
    mkdirSync(join(site, "content", shell), { recursive: true });
    // 每个壳给两页：翻页要有上下篇才渲染，只写一页的话 `td-pager` 根本不在输出里，
    // 下面那条排除断言就永远绿 —— 摘掉 `data-pagefind-ignore` 也不报。
    for (const n of [1, 2]) {
      // 第一页带一个提示框与一个代码块：两者各自要图标（callout 的类型图标、
      // 代码块的复制按钮），下面那条 sprite 断言才不是空跑。
      const body =
        n === 1
          ? "> [!NOTE]\n> a callout brings its own icon.\n\n```sh\necho hi\n```\n"
          : `body ${n} of the ${shell} shell.\n`;
      writeFileSync(
        join(site, "content", shell, `page${n}.md`),
        `---\ntitle: ${shell} page ${n}\nweight: ${n}\n---\n\n${body}`,
      );
    }
  }
  writeFileSync(
    join(site, "content", "start.md"),
    "---\ntitle: landing\nlayout: landing\nsections:\n  - type: cta\n    title: go\n---\n",
  );
  writeFileSync(join(site, "content", "plain.md"), "---\ntitle: plain\n---\n\nno shell here.\n");
  writeFileSync(
    join(site, "hugo.toml"),
    [
      'baseURL = "https://example.org/"',
      'title = "outputs"',
      'theme = "hugo-theme-atlas"',
      'disableKinds = ["taxonomy", "term", "sitemap"]',
      // 开搜索，下面那条 `hidden` 断言才有东西可断。默认关着。
      "[params.ui]",
      "search = true",
      "[markup.goldmark.renderer]",
      "unsafe = true",
      "[markup.goldmark.parser.attribute]",
      "block = true",
      "",
    ].join("\n"),
  );

  const build = run(["--source", site, "--themesDir", join(THEME, "..")]);
  if (!build.ok) throw new Error(`build failed:\n${build.text.slice(-600)}`);

  // RSS 里的内容是 XML 转义过的，断言前解回来 —— 否则每条断言都要写
  // `&lt;table&gt;`，读的人得在脑子里做一次解码。
  const xml = readFileSync(join(site, "public", "feed", "index.xml"), "utf8");
  const rss = xml
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#34;/g, '"')
    .replace(/&#x9;/g, "\t")
    .replace(/&#xA;/g, "\n")
    .replace(/&amp;/g, "&");

  // 这两条是这个检查存在的理由：策略在 HTML 里丢掉的东西不能从 RSS 溜出去。
  for (const leak of ["onclick", 'style="color:red"']) {
    if (rss.includes(leak)) failures.push(`RSS carries ${JSON.stringify(leak)}; the attribute policy is bypassed`);
  }
  // caption 必须是元素。作为 <table> 上的属性时文字在，但它不是图注 —— 阅读器
  // 与朗读器都不会把它跟表格关联起来。
  if (!rss.includes("<caption>cap</caption>")) failures.push("RSS lost <caption>; caption= became an attribute again");
  if (/<table[^>]+caption=/.test(rss)) failures.push("RSS has caption= as a bogus <table> attribute");
  // 语义留着，样式与运行时的钩子不发：feed 阅读器没有 CSS 也没有 JS。
  if (!rss.includes('<th scope="col">')) failures.push("RSS lost scope=col on header cells");
  if (!rss.includes('<th scope="row">')) failures.push("RSS lost scope=row on the matrix first column");
  for (const themeOnly of ["td-table-scroll", "data-td-align", "data-td-scroll-label"]) {
    if (rss.includes(themeOnly)) failures.push(`RSS carries ${themeOnly}, which needs CSS or JS to mean anything`);
  }

  // HTML 那边不该被这个变体影响 —— 同一张表在页面上仍要有滚动包裹。
  const html = readFileSync(join(site, "public", "feed", "tables", "index.html"), "utf8");
  if (!html.includes("td-table-scroll")) failures.push("HTML lost the table scroll wrapper");
  if (html.includes("onclick") || html.includes('style="color:red"')) failures.push("HTML carries a dropped attribute");

  // 每一类页面都必须带 `data-pagefind-body`。
  const classes = [
    ...SHELLS.map((s) => [`${s} shell`, join(s, "page1", "index.html")]),
    ["landing", join("start", "index.html")],
    ["plain single page", join("plain", "index.html")],
    ["home", "index.html"],
  ];
  for (const [label, path] of classes) {
    const page = readFileSync(join(site, "public", path), "utf8");
    if (!page.includes("data-pagefind-body")) {
      failures.push(`${label} lacks data-pagefind-body; that whole page class drops out of the index`);
    }
  }

  // 图标：每个 `<use href="#td-i-X">` 在同一份 HTML 里都要有对应的 symbol。
  //
  // 这条门禁的由来是一次跨文档 `<use href="/dist/icons.svg#id">`：那种写法只有
  // Firefox 实现过，Chrome 与 Safari 都不解析，SVG 2 已把它从规范里删掉。全站
  // 42 个图标一个都没画出来，而**所有可断言的指标都是绿的** —— sprite 请求 200、
  // symbol 与 viewBox 都在、外层 svg 有 16×16 的盒子、fill 计算值正确、无失败
  // 请求。唯一露馅的是浏览器里 `<use>` 自己的 `getBBox()` 为 0，而那要开浏览器
  // 才看得到。这里用静态的等价判据：引用与定义必须在同一份文档里配平。
  for (const path of [join("docs", "page1", "index.html")]) {
    const page = readFileSync(join(site, "public", path), "utf8");
    const refs = new Set([...page.matchAll(/href="#(td-i-[a-z0-9-]+)"/g)].map((m) => m[1]));
    const defs = new Set([...page.matchAll(/<symbol id="(td-i-[a-z0-9-]+)"/g)].map((m) => m[1]));
    // 一个都没有说明 fixture 不再覆盖图标，下面两个循环就是空跑。
    if (refs.size === 0) {
      failures.push(`${path}: no icons rendered; the sprite assertions below are vacuous`);
    }
    for (const ref of refs) {
      if (!defs.has(ref)) failures.push(`${path}: <use href="#${ref}"> has no matching symbol in the same document`);
    }
    for (const def of defs) {
      if (!refs.has(def)) failures.push(`${path}: symbol #${def} is inlined but never referenced`);
    }
    // 跨文档引用是那次回归的形状，直接禁掉。
    if (/href="[^"]*icons\.svg#/.test(page)) {
      failures.push(`${path}: cross-document <use href="...icons.svg#id">; Chrome and Safari do not resolve it`);
    }
  }

  // 面包屑与翻页要被排除。它们带的是**别的页面**的标题，进了索引就是搜到 A 却
  // 因为 B 的标题命中。docs 那页有上下篇也有祖先链，两个 nav 都在。
  const nested = readFileSync(join(site, "public", "docs", "page1", "index.html"), "utf8");
  for (const [label, cls] of [
    ["breadcrumb", "td-breadcrumb"],
    ["pager", "td-pager"],
  ]) {
    const tag = new RegExp(`<nav[^>]*class="${cls}"[^>]*>`).exec(nested);
    // 找不到就报，不是静默通过：这两个 nav 在这份 fixture 上**必须**渲染
    // （祖先链有 docs、同 section 有第二页）。缺了说明 fixture 不再覆盖这条
    // 排除规则，而那时摘掉 `data-pagefind-ignore` 也不会有人发现。
    if (!tag) {
      failures.push(`${label} nav did not render in the fixture; the exclusion assertion below is vacuous`);
    } else if (!tag[0].includes("data-pagefind-ignore")) {
      failures.push(`${label} nav is inside the indexed body without data-pagefind-ignore`);
    }
  }

  // 搜索按钮在 HTML 里必须是 `hidden` 的。搜索整个依赖 JS —— `<dialog>` 不调
  // `showModal()` 就是 `display:none`，所以少了这个属性时无 JS 的读者会看到一个
  // 点了完全没反应的按钮。这条回归在浏览器里也不显眼：开着 JS 的人一切正常。
  const btn = /<button[^>]*data-td-search-open[^>]*>/.exec(nested);
  if (!btn) {
    failures.push("search button did not render; params.ui.search is set in the fixture");
  } else if (!/\shidden[\s>]/.test(btn[0])) {
    failures.push("search button is not hidden in HTML; without JS it is a dead control");
  }
} finally {
  rmSync(site, { recursive: true, force: true });
}

// 不开 shell：临时目录路径作为参数传进去，经 shell 拼接就是一条注入面。
function run(args) {
  const result = spawnSync("hugo", args, { encoding: "utf8" });
  if (result.error) throw result.error;
  return { ok: result.status === 0, text: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log("ok  RSS table output keeps semantics and drops theme-only markup");
console.log("ok  every page class carries data-pagefind-body; navigation is excluded");
console.log("ok  icon <use> references resolve in-document and inline exactly what the page uses");
console.log("ok  the search button ships hidden and is revealed by the runtime");
