// 视觉 token 的正确性：合成之后对不对。
//
// 其余门禁验的都是**结构** —— class 名在不在、data 属性有没有、sprite 引用解析得开。
// 半透明 token 的正确性不在结构里：一个遮罩的字面值完全合法、class 名一个不缺，
// 而它压在画布上之后可能根本不压暗。
//
// 已经因此漏过一个缺陷：搜索与命令面板的遮罩在深色下压暗 0.99×（在提亮，等于没有
// 遮罩），而抽屉那份看起来像抄漏的 15% 反倒是三处里唯一有效的。34 页的 exampleSite
// 全绿，六个输出检查器一条都不响。只有量像素才发现。
//
// 门禁的判据都是**关系**而不是具体数值：遮罩必须压暗、边框必须看得见、选中态上的
// 文字必须过 AA。调色是设计决定，这里不管好不好看，只管功能成不成立。
//
// 阈值全部有出处，见每条断言旁的注释。取值与合成在 scripts/lib/srgb.js，它的数值
// 可信度由 tests/srgb.test.ts 保证 —— 那里有四个浏览器实测参照点，以及一条钉住
// alpha 单位解析的用例（`1%` 曾被读成不透明，害这份门禁漏报过一次）。
//
// 用法：node scripts/check-visual.js

import { readFileSync } from "node:fs";

import { contrast, dimFactor, over, parseColor } from "./lib/srgb.js";

const SRC = "src/css/theme.css";
const src = readFileSync(SRC, "utf8");
const failures = [];
const checks = [];

/**
 * 取一个选择器块里的自定义属性。
 *
 * 只认顶层那一层的声明：块里嵌的 @media 覆盖是另一档，混进来会让"深色档的值"
 * 有两个答案。所以按大括号深度过滤。
 */
function blockTokens(selector) {
  const at = src.indexOf(`\n${selector} {`);
  if (at < 0) throw new Error(`${SRC}: 找不到选择器 ${selector} —— 这份门禁按它取值，结构变了要改这里`);
  const out = new Map();
  let depth = 0;
  for (const line of src.slice(at + 1).split("\n").slice(1)) {
    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;
    if (depth === 0 && closes > opens) break; // 块结束
    if (depth === 0) {
      const m = line.match(/^\s*(--[a-z0-9-]+):\s*([^;]+);/);
      if (m) out.set(m[1], m[2].trim());
    }
    depth += opens - closes;
  }
  return out;
}

const light = blockTokens(":root");
const dark = blockTokens('[data-td-theme="dark"]');

/** 某一档下 token 的最终值：深色档没覆盖就用浅色档的。 */
function tokenIn(mode, name) {
  const raw = mode === "dark" ? (dark.get(name) ?? light.get(name)) : light.get(name);
  if (raw === undefined) return null;
  return parseColor(raw);
}

const MODES = ["light", "dark"];

/** 取一个必需 token，认不出就记一条失败并返回 null。 */
function need(mode, name) {
  const got = tokenIn(mode, name);
  if (!got) failures.push(`${mode}: ${name} 取不到或写法认不出（值：${dark.get(name) ?? light.get(name) ?? "缺失"}）`);
  return got;
}

// ---- 1. 遮罩必须压暗 ----
//
// 这是漏过的那个缺陷。阈值 1.3× 的出处：旧 shell.css 的深色遮罩实测 1.42×，
// 已经偏弱但确实还起作用；而失效的那份是 0.99×。1.3 落在两者之间，且离 0.99
// 足够远 —— 它区分的是"弱"和"没有"，不是"好看"和"更好看"。
for (const mode of MODES) {
  const canvas = need(mode, "--td-canvas");
  const scrim = need(mode, "--td-shell-scrim");
  if (!canvas || !scrim) continue;
  const factor = dimFactor(canvas.rgb, scrim.rgb, scrim.alpha);
  checks.push(`${mode}: 遮罩压暗 ${factor.toFixed(2)}×`);
  if (factor < 1.3) {
    failures.push(
      `${mode}: --td-shell-scrim 压在 --td-canvas 上只压暗 ${factor.toFixed(2)}×（要 ≥1.3×）` +
        `${factor < 1 ? "，它在**提亮** —— 遮罩比画布还亮，等于没有遮罩" : ""}。` +
        `遮罩的作用是让身后的内容退到背景，这个值下读者看不出弹层背后被遮住了`,
    );
  }
}

// ---- 2. 边框与分隔线必须看得见 ----
//
// 半透明边框压在画布上之后可能与画布同色。阈值 1.1:1 很低是有意的：边框是 1px 的
// 细线，WCAG 的 3:1 非文本对比度要求针对的是"传达信息的图形"，而这些线是装饰性
// 分隔。这里只钉住"不是完全隐形"。
for (const mode of MODES) {
  const canvas = need(mode, "--td-canvas");
  if (!canvas) continue;
  for (const name of ["--td-border", "--td-shell-rail"]) {
    const line = need(mode, name);
    if (!line) continue;
    const composited = over(line.rgb, canvas.rgb, line.alpha);
    const ratio = contrast(composited, canvas.rgb);
    checks.push(`${mode}: ${name} 对画布 ${ratio.toFixed(2)}:1`);
    if (ratio < 1.1) {
      failures.push(
        `${mode}: ${name} 压在画布上之后与画布只差 ${ratio.toFixed(2)}:1，看不见 —— ` +
          `半透明的线要么提高不透明度，要么换一个离画布更远的底色`,
      );
    }
  }
}

// ---- 3. 选中态底色上的文字必须过 AA ----
//
// --td-shell-selected 是 accent 混透明压在画布上，而它上面的文字**也是** accent。
// 同一个源：主色调暗时分子分母一起暗，对比度几乎不动。这条捕捉的是"换了主色之后
// 侧栏当前行读不出来"，那是最容易在改配色时踩到的一处。
for (const mode of MODES) {
  const canvas = need(mode, "--td-canvas");
  const accent = need(mode, "--td-link");
  const selectedRaw = light.get("--td-shell-selected");
  if (!canvas || !accent || !selectedRaw) continue;
  // selected 是 color-mix(in srgb, accent P%, transparent)：等价于 accent 取 alpha=P%。
  const mix = selectedRaw.match(/([\d.]+)%\s*,\s*transparent/);
  if (!mix) {
    failures.push(`--td-shell-selected 的写法变了（${selectedRaw}），这条断言按 color-mix 百分比算，要跟着改`);
    continue;
  }
  const bg = over(accent.rgb, canvas.rgb, Number(mix[1]) / 100);
  const ratio = contrast(accent.rgb, bg);
  checks.push(`${mode}: 选中态文字对底色 ${ratio.toFixed(2)}:1`);
  if (ratio < 4.5) {
    failures.push(
      `${mode}: 侧栏当前行的 accent 文字压在 --td-shell-selected 上只有 ${ratio.toFixed(2)}:1，` +
        `不过 AA 的 4.5:1。底色是同一个 accent 混 ${mix[1]}% —— 调暗主色不管用（分子分母一起动），` +
        `要么降混色比例，要么让文字用比底色更深的一档`,
    );
  }
}

// ---- 4. 正文墨色必须过 AA ----
//
// 最基本的一条，放在最后是因为它最不容易错 —— 但没有它这份门禁就不完整：
// 前三条都是在验"衍生关系"，而这条验的是根。
for (const mode of MODES) {
  const canvas = need(mode, "--td-canvas");
  if (!canvas) continue;
  for (const [name, floor, why] of [
    ["--td-ink", 4.5, "正文"],
    ["--td-ink-muted", 4.5, "次要文字仍是文字"],
    ["--td-ink-faint", 3.0, "faint 只用于非正文的标签与计数，按 AA 大字号那一档"],
  ]) {
    const ink = need(mode, name);
    if (!ink) continue;
    const on = ink.alpha < 1 ? over(ink.rgb, canvas.rgb, ink.alpha) : ink.rgb;
    const ratio = contrast(on, canvas.rgb);
    checks.push(`${mode}: ${name} 对画布 ${ratio.toFixed(2)}:1`);
    if (ratio < floor) {
      failures.push(`${mode}: ${name} 对画布 ${ratio.toFixed(2)}:1，低于 ${floor}:1（${why}）`);
    }
  }
}

if (failures.length > 0) {
  for (const f of failures) console.error(`FAIL  ${f}`);
  console.error(`\n阈值的出处写在 ${SRC} 与本脚本的注释里。数值可信度见 tests/srgb.test.ts。`);
  process.exit(1);
}

console.log(`ok  ${checks.length} composited-colour invariant(s) hold in both modes`);
for (const c of checks) console.log(`    ${c}`);
