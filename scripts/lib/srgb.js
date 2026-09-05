// sRGB 与 OKLCH 的取值、合成与对比度。
//
// 为什么要有这一份：主题的视觉 token 有一多半是**半透明**的（遮罩、边框、选中态、
// 分隔线），它们的正确性不在字面值上，而在压到画布上之后的结果上。已经因此漏过一
// 个缺陷：搜索与命令面板的遮罩在深色下压暗 0.99×，等于没有遮罩，而 34 页的
// exampleSite 全绿、六个输出检查器一条都不响 —— 所有门禁验的都是结构。
//
// **合成必须在 sRGB gamma 空间做，不是线性空间。** 我第一次算这个的时候在线性空间
// 合成，得出遮罩压暗 1.81×；浏览器实测是 3.26×，差一倍有余。CSS 的 alpha 合成走
// gamma 空间，只有它是读者看到的那个数。相对亮度（WCAG）反过来必须在线性空间算 ——
// 那是亮度的定义。两处不能搞混。
//
// OKLab 矩阵取自 Björn Ottosson 的定义。不引依赖：这几个矩阵是常量，
// 而多一个包意味着多一处版本与许可要记进 VENDOR.json。

/** sRGB 分量（0–1）转线性。 */
export const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** 线性转 sRGB 分量（0–1）。 */
export const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** `#rgb` / `#rrggbb` → sRGB 分量三元组（0–1）。 */
export function hex(s) {
  let h = s.replace("#", "").trim();
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = Number.parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * OKLCH → sRGB 分量三元组（0–1），越界分量截断。
 *
 * 截断而不报错：主题里的值都在色域内，而截断让这个函数对任何输入都有定义 ——
 * 门禁要的是一个数，不是一个异常。
 */
export function oklch(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, toSrgb(v))));
}

/** WCAG 相对亮度。输入是 sRGB 分量（0–1），内部转线性 —— 那是亮度的定义。 */
export function luminance([r, g, b]) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * 半透明前景压在不透明背景上。**在 sRGB gamma 空间做** —— 见文件头。
 *
 * @param {number[]} fg 前景 sRGB 分量
 * @param {number[]} bg 背景 sRGB 分量
 * @param {number} alpha 0–1
 */
export function over(fg, bg, alpha) {
  return fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));
}

/** WCAG 对比度。 */
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** 压暗倍数：背景亮度 ÷ 压上遮罩后的亮度。<1 表示遮罩在提亮。 */
export function dimFactor(bg, scrim, alpha) {
  const after = luminance(over(scrim, bg, alpha));
  return luminance(bg) / Math.max(after, 1e-9);
}

/**
 * 一个数字字段：`45%` → 0.45，`0.45` → 0.45。
 *
 * **百分号是唯一判据。** 第一版按「数值大于 1 就当百分数」猜，于是 `1%` 不大于 1，
 * 被读成 alpha=1.0 完全不透明 —— 破坏测试把边框透明度降到 1% 时门禁没响，因为它
 * 认为那是不透明的。`0.5%` 同样会被读成 50%。猜单位在边界上一定错。
 */
const field = (raw) => (raw.endsWith("%") ? Number(raw.slice(0, -1)) / 100 : Number(raw));

/**
 * CSS 颜色值 → `{ rgb, alpha }`。认三种写法：hex、`oklch()`、`rgb()`（空格语法）。
 *
 * 认不出返回 null 而不抛：调用方只管它认识的那几个 token，出现新写法时应当是
 * 「这一条跳过并点名」而不是「整个门禁挂掉」。`color-mix()` 有意不认 —— 它要解析
 * 嵌套的 var() 引用，那是另一件事，调用方自己按混色比例算。
 */
export function parseColor(value) {
  const v = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return { rgb: hex(v), alpha: 1 };

  const ok = v.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i);
  if (ok) {
    return {
      rgb: oklch(field(ok[1]), Number(ok[2]), Number(ok[3])),
      alpha: ok[4] === undefined ? 1 : field(ok[4]),
    };
  }

  const rgbm = v.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i);
  if (rgbm) {
    return {
      rgb: [Number(rgbm[1]) / 255, Number(rgbm[2]) / 255, Number(rgbm[3]) / 255],
      alpha: rgbm[4] === undefined ? 1 : field(rgbm[4]),
    };
  }
  return null;
}
