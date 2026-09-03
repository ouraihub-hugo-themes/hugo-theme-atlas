// locale 的 schema 门禁，兼铺英文兜底的工具。
//
// 规则只有一条：**32 个 locale 必须键集完全相同。** 缺键的表现是那一句在那个
// 语言下回落到键名本身 —— 读者看到的是 `search_placeholder` 而不是一句话，
// 而构建不报错（Hugo 的 i18n 缺键只在 `--printI18nWarnings` 下出声）。
//
// 复数键（`one:` / `other:` 那种）比平键更容易漏：它的子键也要对齐。Hugo 走
// go-i18n 的 CLDR 复数规则，语言只有一种复数形态时（中日韩）多出来的 `one`
// 永远不被选中，无害；反过来缺了某语言真正需要的类别，那一句就落空。所以这里
// 要求所有语言的子键与英文一致，多的允许（语言自己需要 `few`/`many` 时加），
// 少的不允许。
//
// `--sync` 把缺的键按英文原文补进去。**那是脚手架不是翻译** —— 补进去的行
// 带 `# TODO(i18n)` 标记，好让「还没翻」与「翻好了恰好同形」区分开来。

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "i18n";
const BASE = "en";
const TODO = "# TODO(i18n): untranslated, copied from en";

const sync = process.argv.includes("--sync");

/**
 * 极简 YAML 读取：只认这个 schema 里出现的两种形状。
 *
 * 不引 yaml 依赖：这是个门禁脚本，locale 文件的形状由这份 schema 自己规定
 * （两层、无列表、无锚点），为它装一个通用解析器等于给一个已知形状引入一个
 * 未知的失败面。真正的解析由 Hugo 做，这里只数键。
 */
function parse(text) {
  const keys = new Map();
  let current = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;

    const top = /^([A-Za-z0-9_]+):(.*)$/.exec(line);
    if (top) {
      const [, key, rest] = top;
      current = key;
      keys.set(key, rest.trim() === "" ? new Set() : null);
      continue;
    }
    const sub = /^\s+([A-Za-z0-9_]+):/.exec(line);
    if (sub && current) {
      const bucket = keys.get(current);
      if (bucket instanceof Set) bucket.add(sub[1]);
    }
  }
  return keys;
}

/** 一个键在源文件里的完整文本，含它上面紧邻的注释块。 */
function block(text, key) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => new RegExp(`^${key}:`).test(l));
  if (start < 0) return null;
  let end = start + 1;
  while (end < lines.length && /^\s+\S/.test(lines[end])) end += 1;
  return lines.slice(start, end).join("\n");
}

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => f.replace(/\.yaml$/, ""));

if (!files.includes(BASE)) {
  console.error(`${DIR}/${BASE}.yaml is missing; it defines the schema`);
  process.exit(1);
}

const baseText = readFileSync(join(DIR, `${BASE}.yaml`), "utf8");
const base = parse(baseText);
const failures = [];
let patched = 0;

for (const name of files) {
  if (name === BASE) continue;
  const path = join(DIR, `${name}.yaml`);
  let text = readFileSync(path, "utf8");
  const own = parse(text);

  const missing = [...base.keys()].filter((k) => !own.has(k));
  const extra = [...own.keys()].filter((k) => !base.has(k));

  // 子键：英文有的，这个语言也必须有。多的不管（语言自己的复数类别）。
  const subGaps = [];
  for (const [key, wanted] of base) {
    if (!(wanted instanceof Set) || !own.has(key)) continue;
    const mine = own.get(key);
    if (!(mine instanceof Set)) {
      subGaps.push(`${key} must be a plural map, got a plain string`);
      continue;
    }
    for (const form of wanted) {
      if (!mine.has(form)) subGaps.push(`${key}.${form}`);
    }
  }

  if (sync && missing.length > 0) {
    const additions = missing
      .map((k) => block(baseText, k))
      .filter((b) => b !== null)
      .map((b) => `${TODO}\n${b}`);
    if (additions.length > 0) {
      if (!text.endsWith("\n")) text += "\n";
      writeFileSync(path, `${text}\n${additions.join("\n\n")}\n`, "utf8");
      patched += additions.length;
      continue;
    }
  }

  for (const k of missing) failures.push(`${name}: missing ${k}`);
  for (const k of extra) failures.push(`${name}: has ${k}, which ${BASE} does not`);
  for (const g of subGaps) failures.push(`${name}: missing ${g}`);
}

if (sync) {
  console.log(
    patched === 0
      ? `ok  ${files.length} locales already share the schema; nothing to sync`
      : `synced  ${patched} key(s) copied from ${BASE}; each marked ${TODO.slice(2)}`,
  );
  if (patched > 0) process.exit(0);
}

if (failures.length > 0) {
  for (const f of failures.slice(0, 40)) console.error(`FAIL  ${f}`);
  if (failures.length > 40) console.error(`... and ${failures.length - 40} more`);
  console.error(`\nrun 'pnpm i18n:sync' to scaffold the missing keys from ${BASE}`);
  process.exit(1);
}

const count = base.size;
console.log(`ok  ${files.length} locales, ${count} keys each, schema identical`);
