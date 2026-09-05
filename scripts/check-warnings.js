// 非法作者输入必须 warn、必须回退、必须不炸构建。
//
// 为什么不把这些用例放进 exampleSite：那一份是发布门禁跑 --panicOnWarning 的
// 站点，一页故意写错的内容会让门禁永远红着。用例在 tests/invalid/ 下，每次
// 检查复制到临时站点里构建，跑完即弃。
//
// 每个用例文件在 front matter 里用 expect 列出它该产出的警告片段。断言写在
// 用例旁边而不是脚本里 —— 加一个用例只改一个文件。

import { spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CASES = "tests/invalid";
const DATA = "tests/invalid-data";
const THEME = process.cwd();

// front matter 里的 expect 列表。YAML 解析器不引进来：只认这一种形状的数组。
function expectations(md) {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md);
  if (!front) return [];
  const block = /^expect:\r?\n((?:\s*-\s.*\r?\n?)+)/m.exec(front[1]);
  if (!block) return [];
  return block[1]
    .split(/\r?\n/)
    .map((line) => /^\s*-\s+(.*)$/.exec(line)?.[1]?.trim())
    .filter(Boolean)
    .map((value) => value.replace(/^["'](.*)["']$/, "$1"));
}

const files = readdirSync(CASES).filter((name) => name.endsWith(".md"));
if (files.length === 0) {
  console.error(`${CASES} has no cases`);
  process.exit(1);
}

const site = mkdtempSync(join(tmpdir(), "atlas-warn-"));
const failures = [];

try {
  // 用例进 content/docs/ 而非根层：docs 在 shell_types 里，所以用例页跑的是
  // 完整阅读外壳，外壳自己的校验（reading_width 之类）也一并被覆盖。
  mkdirSync(join(site, "content", "docs"), { recursive: true });
  // 主题名要和 exampleSite 一致，themesDir 指向仓库的父目录。
  writeFileSync(
    join(site, "hugo.toml"),
    [
      'baseURL = "https://example.org/"',
      'title = "warning cases"',
      'theme = "hugo-theme-atlas"',
      'disableKinds = ["taxonomy", "term", "sitemap", "rss"]',
      "[markup.goldmark.renderer]",
      "unsafe = true",
      "[markup.goldmark.parser]",
      "wrapStandAloneImageWithinParagraph = false",
      "[markup.goldmark.parser.attribute]",
      "block = true",
      "[markup.highlight]",
      "noClasses = false",
      // 站点级配置的非法值从用例正文里够不到 —— params.ui.* 不是页面属性。
      // 这里故意配坏 plantuml：地址是相对路径（PlantUML 服务器只能是绝对
      // 地址），format 不在白名单。两条各自 warn，而围栏退回"未配置"那条路，
      // 因此 tests/invalid/plantuml.md 里的围栏同时验证了回落行为。
      "[params.ui.plantuml]",
      'server = "/not-a-server"',
      'format = "gif"',
      // giscus 也只能在这里配坏。这份配置缺两个键、repo 写成了完整 URL、
      // mapping 是个不存在的值 —— 三条各自 warn，评论区整个不渲染。
      //
      // "配了一半"是这里唯一值得测的形状：四个键一个都不配是"没开评论",
      // 而少一个的 giscus 会在 iframe 里给读者一句英文报错。
      "[params.ui.comments]",
      'repo = "https://github.com/owner/repo"',
      'repo_id = "R_placeholder"',
      'mapping = "slug"',
      "",
    ].join("\n"),
  );
  cpSync(CASES, join(site, "content", "docs"), { recursive: true });
  // 数据文件的校验（contributors 那一类）从正文里够不到：坏数据必须是一个
  // data/ 下的文件，而这个临时站点默认没有 data/。放在 CASES 里会被当成内容
  // 复制进 content/docs/，所以另开一个平级目录。
  cpSync(DATA, join(site, "data"), { recursive: true });

  const build = run(["--source", site, "--themesDir", join(THEME, ".."), "--renderToMemory", "--logLevel", "warn"]);
  // 非法输入不该让普通构建失败 —— 那是这批用例的核心断言之一。
  if (!build.ok) failures.push(`an ordinary build failed on the invalid cases:\n${build.text.slice(-600)}`);
  const output = build.text;

  for (const name of files) {
    const wanted = expectations(readFileSync(join(CASES, name), "utf8"));
    if (wanted.length === 0) {
      failures.push(`${name}: no expect: list in front matter`);
      continue;
    }
    for (const fragment of wanted) {
      if (!output.includes(fragment)) failures.push(`${name}: no warning matched ${JSON.stringify(fragment)}`);
    }
  }

  // 同一批输入在 --panicOnWarning 下必须失败。没有这一条，一个不再 warn 的
  // 回归会安静地通过上面的检查（片段没匹配上才报，而这里证明确实在 warn）。
  const gate = run(["--source", site, "--themesDir", join(THEME, ".."), "--renderToMemory", "--panicOnWarning"]);
  if (gate.ok) failures.push("--panicOnWarning built the invalid cases without failing");
} finally {
  rmSync(site, { recursive: true, force: true });
}

// spawnSync 而非 execFileSync：后者成功时只返回 stdout，而 Hugo 把警告写在
// stderr 且照常以 0 退出 —— 用 execFileSync 会一条警告都读不到。
//
// 不开 shell：临时目录路径会作为参数传进去，经 shell 拼接就是一条注入面，
// 而 hugo 是可执行文件本身，不需要 shell 解析。
//
// timeout 是必须的：本地这批用例整批 1 秒内跑完，但一次挂住的构建在 CI 上会一直
// 等到 job 上限，而那时的报错是"job 被取消"，看不出卡在哪一步。超时时 spawnSync
// 把 error 设成 ETIMEDOUT，下面那句 throw 就是它的出口。
function run(args) {
  const result = spawnSync("hugo", args, { encoding: "utf8", timeout: 120_000 });
  if (result.error) throw result.error;
  return { ok: result.status === 0, text: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log(`ok  ${files.length} invalid-input case file(s), all expected warnings present`);
