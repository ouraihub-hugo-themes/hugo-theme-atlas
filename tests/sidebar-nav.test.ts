import { describe, expect, it } from "vitest";

import { parseKeys } from "../src/ts/sidebar-nav.js";

// localStorage 是外部输入：别的脚本写过、旧版本格式、被手改过都有可能。
// 任何一种坏数据都得退化成空集合，而不是让侧栏抛异常罢工。

describe("parseKeys", () => {
  it("读回写进去的键", () => {
    expect(parseKeys('["/docs/","/docs/components/"]')).toEqual(["/docs/", "/docs/components/"]);
  });

  it("空值与空数组都是空集合", () => {
    expect(parseKeys(null)).toEqual([]);
    expect(parseKeys("")).toEqual([]);
    expect(parseKeys("[]")).toEqual([]);
  });

  it("坏 JSON 不抛", () => {
    expect(parseKeys("{oops")).toEqual([]);
    expect(parseKeys("undefined")).toEqual([]);
  });

  it("不是数组的合法 JSON 也退化成空", () => {
    expect(parseKeys('"/docs/"')).toEqual([]);
    expect(parseKeys('{"/docs/":true}')).toEqual([]);
    expect(parseKeys("42")).toEqual([]);
    expect(parseKeys("null")).toEqual([]);
  });

  it("滤掉数组里的非字符串项，保留好的", () => {
    expect(parseKeys('["/docs/",1,null,{},"/blog/"]')).toEqual(["/docs/", "/blog/"]);
  });
});
