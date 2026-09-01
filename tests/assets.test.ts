import { describe, expect, it } from "vitest";

import { assetBlock, assetLine } from "../src/ts/assets.js";

describe("assetLine", () => {
  it("两个空格分隔 —— 一个空格的形式 sha256sum -c 不认", () => {
    expect(assetLine("abc123", "myapp-linux-amd64.tar.gz")).toBe(
      "abc123  myapp-linux-amd64.tar.gz",
    );
  });
});

describe("assetBlock", () => {
  it("末尾留换行：少了它 sha256sum -c 会漏掉最后一行", () => {
    const out = assetBlock([
      { hash: "aaa", name: "one.tar.gz" },
      { hash: "bbb", name: "two.zip" },
    ]);
    expect(out).toBe("aaa  one.tar.gz\nbbb  two.zip\n");
  });

  it("空表返回空串，不是一个孤零零的换行", () => {
    expect(assetBlock([])).toBe("");
  });
});
