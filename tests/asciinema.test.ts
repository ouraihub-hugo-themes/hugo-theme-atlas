import { describe, expect, it } from "vitest";
import { prefersReducedMotion, readOptions } from "../src/ts/asciinema.js";

// readOptions 只读 dataset，一个带 dataset 的假对象就够，不用 jsdom。
function host(data: Record<string, string>): HTMLElement {
  return { dataset: data } as unknown as HTMLElement;
}

describe("readOptions", () => {
  it("布尔项只认 \"true\"", () => {
    expect(readOptions(host({ tdCastLoop: "true" })).loop).toBe(true);
    // 这三种都是"关"。"false" 那条最要紧：dataset 的值全是字符串，非空字符串
    // 是真值，直接转交播放器的话作者写 loop=false 反而会循环播放。
    expect(readOptions(host({ tdCastLoop: "false" })).loop).toBeUndefined();
    expect(readOptions(host({ tdCastLoop: "" })).loop).toBeUndefined();
    expect(readOptions(host({})).loop).toBeUndefined();
  });

  it("autoplay 让位于读者的减少动效设置", () => {
    expect(readOptions(host({ tdCastAutoplay: "true" }), false).autoPlay).toBe(true);
    expect(readOptions(host({ tdCastAutoplay: "true" }), true).autoPlay).toBeUndefined();
  });

  it("数值项挡掉 NaN 与非正数", () => {
    expect(readOptions(host({ tdCastSpeed: "2.5" })).speed).toBe(2.5);
    // NaN 传进播放器会让它算出 NaN 的时间轴，进度条不动而控制台一声不响。
    expect(readOptions(host({ tdCastSpeed: "fast" })).speed).toBeUndefined();
    expect(readOptions(host({ tdCastSpeed: "0" })).speed).toBeUndefined();
    expect(readOptions(host({ tdCastSpeed: "-1" })).speed).toBeUndefined();
  });

  it("cols/rows 要整数", () => {
    expect(readOptions(host({ tdCastCols: "80" })).cols).toBe(80);
    expect(readOptions(host({ tdCastCols: "80.5" })).cols).toBeUndefined();
  });

  it("字符串项原样转交", () => {
    const opts = readOptions(host({ tdCastPoster: "npt:0:03", tdCastStart: "npt:1:23" }));
    expect(opts.poster).toBe("npt:0:03");
    expect(opts.startAt).toBe("npt:1:23");
  });
});

describe("prefersReducedMotion", () => {
  it("matchMedia 缺席时按不要求处理", () => {
    // 老浏览器与非浏览器环境里没有 matchMedia。缺省成"要求减少动效"会让所有
    // 作者设的 autoplay 静默失效，反过来才是安全的默认。
    expect(prefersReducedMotion({})).toBe(false);
  });

  it("读 matchMedia 的结果", () => {
    const win = { matchMedia: () => ({ matches: true }) } as unknown as Window;
    expect(prefersReducedMotion(win)).toBe(true);
  });
});
