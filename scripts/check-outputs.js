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
  writeFileSync(
    join(site, "hugo.toml"),
    [
      'baseURL = "https://example.org/"',
      'title = "outputs"',
      'theme = "hugo-theme-atlas"',
      'disableKinds = ["taxonomy", "term", "sitemap"]',
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
