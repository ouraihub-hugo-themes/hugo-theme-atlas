import { describe, expect, it } from "vitest";

// @ts-expect-error 纯 JS 工具模块，无类型声明；这里只验数值，不需要类型
import { contrast, dimFactor, hex, luminance, oklch, over, parseColor, toLinear } from "../scripts/lib/srgb.js";

// 这个模块喂给 check-visual.js 的断言，所以它自己得先对。参照点分两类：
// 手算得出的，和浏览器实测的。后者更重要 —— 我第一版在线性空间合成，自洽但
// 与浏览器差一倍有余。

describe("基本换算", () => {
  it("hex 认三位与六位", () => {
    expect(hex("#fff")).toEqual([1, 1, 1]);
    expect(hex("#000000")).toEqual([0, 0, 0]);
    expect(hex("#f1f4f8").map((v: number) => Math.round(v * 255))).toEqual([241, 244, 248]);
  });

  it("toLinear 在拐点两侧都对", () => {
    expect(toLinear(0)).toBe(0);
    expect(toLinear(1)).toBeCloseTo(1, 10);
    // 0.04045 是分段点，两侧的式子在这里必须接上
    expect(toLinear(0.04045)).toBeCloseTo(0.04045 / 12.92, 6);
  });

  it("纯白纯黑的亮度是 1 与 0", () => {
    expect(luminance([1, 1, 1])).toBeCloseTo(1, 10);
    expect(luminance([0, 0, 0])).toBe(0);
  });

  it("白对黑是 21:1 —— WCAG 的上限", () => {
    expect(contrast([1, 1, 1], [0, 0, 0])).toBeCloseTo(21, 6);
  });

  it("同色对自己是 1:1", () => {
    expect(contrast(hex("#f1f4f8"), hex("#f1f4f8"))).toBeCloseTo(1, 10);
  });
});

describe("oklch", () => {
  it("L=1 C=0 是白，L=0 是黑", () => {
    expect(oklch(1, 0, 0).map((v: number) => Math.round(v * 255))).toEqual([255, 255, 255]);
    expect(oklch(0, 0, 0).map((v: number) => Math.round(v * 255))).toEqual([0, 0, 0]);
  });

  it("色域外的分量截断而不是溢出", () => {
    for (const v of oklch(0.5, 0.4, 150)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("over 在 sRGB 空间合成", () => {
  it("alpha=0 与 1 是两个端点", () => {
    const fg = hex("#000");
    const bg = hex("#fff");
    expect(over(fg, bg, 0)).toEqual(bg);
    expect(over(fg, bg, 1)).toEqual(fg);
  });

  it("黑 50% 压在白上是 sRGB 中点 127/128，不是线性中点", () => {
    // 线性空间合成会给约 188（#bcbcbc）—— 那是错的那条路，这一条钉住它不回去
    const got = Math.round(over(hex("#000"), hex("#fff"), 0.5)[0]! * 255);
    expect(got).toBe(128);
  });
});

describe("parseColor", () => {
  it("小 alpha 百分数按百分数读 —— 百分号是唯一判据", () => {
    // 这一条来自一次真实的漏报：check-visual.js 的破坏测试把边框透明度降到 1%，
    // 门禁没响。原因是第一版按"数值大于 1 就当百分数"猜单位，而 1 不大于 1，
    // 于是 1% 被读成 alpha=1.0 完全不透明，边框反倒更清晰了。
    expect(parseColor("oklch(42% 0.06 250deg / 1%)").alpha).toBeCloseTo(0.01, 10);
    expect(parseColor("oklch(42% 0.06 250deg / 0.5%)").alpha).toBeCloseTo(0.005, 10);
    expect(parseColor("rgb(11 17 25 / 2%)").alpha).toBeCloseTo(0.02, 10);
  });

  it("不带百分号的 alpha 是小数", () => {
    expect(parseColor("oklch(42% 0.06 250deg / 0.45)").alpha).toBeCloseTo(0.45, 10);
  });

  it("省略 alpha 就是不透明", () => {
    expect(parseColor("#16222e").alpha).toBe(1);
    expect(parseColor("oklch(42% 0.06 250deg)").alpha).toBe(1);
  });

  it("L 的百分号与小数两种写法等价", () => {
    const a = parseColor("oklch(20% 0.02 250deg)").rgb;
    const b = parseColor("oklch(0.2 0.02 250deg)").rgb;
    expect(a).toEqual(b);
  });

  it("认不出的写法返回 null，不抛", () => {
    // color-mix 有意不认：调用方按混色比例自己算，见 srgb.js 的注释
    expect(parseColor("color-mix(in srgb, var(--td-accent) 14%, transparent)")).toBeNull();
    expect(parseColor("var(--td-ink)")).toBeNull();
    expect(parseColor("1.5rem")).toBeNull();
  });
});

describe("dimFactor 对上浏览器实测", () => {
  // 四个值全部来自 Chrome 里 canvas 合成后读像素，见 theme.css 里那张表。
  const LIGHT = hex("#f1f4f8");
  const DARK = hex("#0d161f");

  it("浅色档 L=20% a=45% → 3.26×", () => {
    expect(dimFactor(LIGHT, oklch(0.2, 0.02, 250), 0.45)).toBeCloseTo(3.26, 1);
  });

  it("深色档照搬 L=20% → 0.99×，遮罩在提亮", () => {
    expect(dimFactor(DARK, oklch(0.2, 0.02, 250), 0.45)).toBeCloseTo(0.99, 1);
  });

  it("旧 shell.css 的 L=15% → 1.42×", () => {
    expect(dimFactor(DARK, oklch(0.15, 0.02, 250), 0.45)).toBeCloseTo(1.42, 1);
  });

  it("现在的深色档 L=0% → 2.18×", () => {
    expect(dimFactor(DARK, oklch(0, 0.02, 250), 0.45)).toBeCloseTo(2.18, 1);
  });
});
