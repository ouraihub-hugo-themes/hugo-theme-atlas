import { describe, expect, it } from "vitest";
import { readAnswer } from "../src/ts/feedback.js";

/** 一个假 Storage：只要 getItem，可以让它抛。 */
function store(value: string | null, throws = false): Pick<Storage, "getItem"> {
  return {
    getItem: () => {
      if (throws) throw new DOMException("denied", "SecurityError");
      return value;
    },
  };
}

describe("readAnswer", () => {
  it("accepts the two answers it wrote", () => {
    expect(readAnswer(store("helpful"), "k")).toBe("helpful");
    expect(readAnswer(store("not_helpful"), "k")).toBe("not_helpful");
  });

  // 白名单存在的理由。这些值都进不去，但都可能读出来 —— 上一版主题写的、
  // 同域下另一个站点写的、或者被人手改过。收下一个不认识的值会让界面停在
  // "两个按钮都未选中且都禁用"，既没答案也不能答。
  it("treats anything else as unanswered", () => {
    for (const bad of ["", "solved", "yes", "true", "1", "null", "HELPFUL"]) {
      expect(readAnswer(store(bad), "k")).toBeNull();
    }
    expect(readAnswer(store(null), "k")).toBeNull();
  });

  // 隐私模式下 getItem 本身抛。抛出去会中断整个 main bundle 的后续初始化。
  it("survives a storage backend that throws", () => {
    expect(readAnswer(store("helpful", true), "k")).toBeNull();
  });
});
