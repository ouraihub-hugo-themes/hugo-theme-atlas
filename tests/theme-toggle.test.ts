import { describe, expect, it } from "vitest";
import { readChoice, resolve, store } from "../src/ts/theme-toggle.js";

function fakeStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    read: () => Object.fromEntries(map),
  };
}

describe("readChoice", () => {
  it("defaults to system when unset", () => {
    expect(readChoice(fakeStore())).toBe("system");
  });

  it("rejects a garbage stored value rather than trusting it", () => {
    expect(readChoice(fakeStore({ "td-theme": "chartreuse" }))).toBe("system");
  });

  it("reads an explicit choice", () => {
    expect(readChoice(fakeStore({ "td-theme": "dark" }))).toBe("dark");
  });
});

describe("resolve", () => {
  it("follows the system query only for system", () => {
    expect(resolve("system", true)).toBe("dark");
    expect(resolve("system", false)).toBe("light");
  });

  it("ignores the system query once the user picked", () => {
    expect(resolve("light", true)).toBe("light");
    expect(resolve("dark", false)).toBe("dark");
  });
});

describe("store", () => {
  it("clears the key for system so the site can follow the OS later", () => {
    const s = fakeStore({ "td-theme": "dark" });
    store("system", s);
    expect(s.read()).toEqual({});
  });

  it("persists an explicit choice", () => {
    const s = fakeStore();
    store("dark", s);
    expect(s.read()).toEqual({ "td-theme": "dark" });
  });
});
