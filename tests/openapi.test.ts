import { describe, expect, it } from "vitest";
import { loadAsset, readConfig } from "../src/ts/openapi.js";

/** 假元素：只实现 loadAsset 用到的那几个成员，够用且不拖 jsdom。 */
class FakeEl {
  src = "";
  href = "";
  rel = "";
  integrity = "";
  crossOrigin: string | null = null;
  listeners = new Map<string, () => void>();

  addEventListener(type: string, fn: () => void): void {
    this.listeners.set(type, fn);
  }

  fire(type: string): void {
    this.listeners.get(type)?.();
  }
}

function fakeDoc() {
  const created: { tag: string; el: FakeEl }[] = [];
  const appended: FakeEl[] = [];
  const doc = {
    createElement(tag: string) {
      const el = new FakeEl();
      created.push({ tag, el });
      return el;
    },
    head: {
      append(el: FakeEl) {
        appended.push(el);
      },
    },
  } as unknown as Document;
  return { doc, created, appended };
}

describe("loadAsset", () => {
  it("脚本用 src，样式表用 rel + href", () => {
    const a = fakeDoc();
    void loadAsset("https://cdn.example.com/a.js", "script", "", a.doc);
    expect(a.created[0]!.tag).toBe("script");
    expect(a.created[0]!.el.src).toBe("https://cdn.example.com/a.js");

    const b = fakeDoc();
    void loadAsset("https://cdn.example.com/b.css", "style", "", b.doc);
    expect(b.created[0]!.tag).toBe("link");
    expect(b.created[0]!.el.rel).toBe("stylesheet");
    expect(b.created[0]!.el.href).toBe("https://cdn.example.com/b.css");
  });

  it("给了 integrity 就必须同时给 crossorigin", () => {
    // 这是规范要求：带 integrity 而不带 crossorigin 时浏览器拿不到校验所需的
    // 响应，脚本被直接拒绝加载。漏了的表现是"什么都没发生"，很难查。
    const { doc, created } = fakeDoc();
    void loadAsset("https://cdn.example.com/c.js", "script", "sha384-abc", doc);
    expect(created[0]!.el.integrity).toBe("sha384-abc");
    expect(created[0]!.el.crossOrigin).toBe("anonymous");
  });

  it("没有 integrity 时不设 crossorigin", () => {
    // 同源自托管的文件不需要它，设了反而多一次 CORS 预检。
    const { doc, created } = fakeDoc();
    void loadAsset("/js/vendor/d.js", "script", "", doc);
    expect(created[0]!.el.integrity).toBe("");
    expect(created[0]!.el.crossOrigin).toBeNull();
  });

  it("同一个 URL 只取一次", () => {
    // 一页两个实例共用一个 runtime，取两遍是白发一个请求。
    const { doc, appended } = fakeDoc();
    const first = loadAsset("https://cdn.example.com/same.js", "script", "", doc);
    const second = loadAsset("https://cdn.example.com/same.js", "script", "", doc);
    expect(second).toBe(first);
    expect(appended).toHaveLength(1);
  });

  it("load 事件兑现，error 事件拒绝", async () => {
    const ok = fakeDoc();
    const p = loadAsset("https://cdn.example.com/ok.js", "script", "", ok.doc);
    ok.created[0]!.el.fire("load");
    await expect(p).resolves.toBeUndefined();

    const bad = fakeDoc();
    const q = loadAsset("https://cdn.example.com/bad.js", "script", "", bad.doc);
    bad.created[0]!.el.fire("error");
    await expect(q).rejects.toThrow("failed to load https://cdn.example.com/bad.js");
  });
});

describe("readConfig", () => {
  const host = (json: string | null) =>
    ({
      querySelector: () => (json === null ? null : { textContent: json }),
    }) as unknown as Document;

  it("读出配置，缺省字段补空串", () => {
    expect(readConfig("redoc", host('{"js":"/r.js"}'))).toEqual({
      js: "/r.js",
      css: "",
      integrity: "",
      cssIntegrity: "",
    });
  });

  it("四个字段都在时原样读出", () => {
    const json = '{"js":"/a.js","css":"/a.css","integrity":"sha384-x","cssIntegrity":"sha384-y"}';
    expect(readConfig("swagger", host(json))).toEqual({
      js: "/a.js",
      css: "/a.css",
      integrity: "sha384-x",
      cssIntegrity: "sha384-y",
    });
  });

  it("坏 JSON、缺失的 script、没有 js 都返回 null", () => {
    // 返回 null 而不是抛：读不出配置时页面上留的是回落链接，那份 spec 本身有用。
    expect(readConfig("redoc", host("{oops"))).toBeNull();
    expect(readConfig("redoc", host(null))).toBeNull();
    expect(readConfig("redoc", host(""))).toBeNull();
    expect(readConfig("redoc", host('{"css":"/only.css"}'))).toBeNull();
    expect(readConfig("redoc", host("[1,2]"))).toBeNull();
    expect(readConfig("redoc", host("null"))).toBeNull();
  });
});
