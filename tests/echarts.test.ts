import { describe, expect, it } from "vitest";
import type { EChartsOption } from "echarts/types/dist/shared";
import { chartOption, currentTheme, seriesTypes, supportedTypes } from "../src/ts/echarts.js";

// chartOption 只调 querySelector 读 textContent，假对象够用，不拖 jsdom。
function host(json: string | null): Element {
  const script = json === null ? null : { textContent: json };
  return { querySelector: () => script } as unknown as Element;
}

describe("seriesTypes", () => {
  it("数组与单对象两种写法都认", () => {
    // echarts 自己两种都收，这里跟着 —— 只认数组的话作者写 `series: {…}`
    // 会得到一张空白的图，而构建时什么都没说。
    expect(seriesTypes({ series: [{ type: "line" }, { type: "bar" }] } as EChartsOption)).toEqual([
      "line",
      "bar",
    ]);
    expect(seriesTypes({ series: { type: "pie" } } as EChartsOption)).toEqual(["pie"]);
  });

  it("重复的图种只算一次", () => {
    // 同一个 chunk 不必 import 两遍。
    expect(
      seriesTypes({ series: [{ type: "line" }, { type: "line" }] } as EChartsOption),
    ).toEqual(["line"]);
  });

  it("没有 series 或 type 缺失时返回空", () => {
    expect(seriesTypes({} as EChartsOption)).toEqual([]);
    expect(seriesTypes({ series: [{ data: [1] }] } as EChartsOption)).toEqual([]);
    expect(seriesTypes({ series: [null] } as unknown as EChartsOption)).toEqual([]);
  });
});

describe("chartOption", () => {
  it("读出 JSON", () => {
    expect(chartOption(host('{"series":[{"type":"line"}]}'))).toEqual({
      series: [{ type: "line" }],
    });
  });

  it("坏 JSON 与缺失的 script 都返回 null", () => {
    // 返回 null 而不是抛：一张读不出来的图不该让同一页其他图也画不出来。
    expect(chartOption(host("{oops"))).toBeNull();
    expect(chartOption(host(null))).toBeNull();
    expect(chartOption(host(""))).toBeNull();
  });
});

describe("supportedTypes", () => {
  it("八种，与围栏里的名单一致", () => {
    // render-codeblock-echarts.html 里有同一份名单（模板读不到这里）。
    // 两处不一致的表现是：构建时放过去了，浏览器里画不出来。
    expect([...supportedTypes].sort()).toEqual(
      ["bar", "graph", "heatmap", "line", "pie", "radar", "scatter", "tree"].sort(),
    );
  });
});

describe("currentTheme", () => {
  it("只有显式 dark 才是深色", () => {
    const root = (v: string | null) => ({ getAttribute: () => v }) as unknown as HTMLElement;
    expect(currentTheme(root("dark"))).toBe("dark");
    expect(currentTheme(root("light"))).toBe("light");
    expect(currentTheme(root(null))).toBe("light");
  });
});
