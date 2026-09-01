import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// 字体表与磁盘文件失联是静默失败：浏览器只是回退字形，不报错。两个方向
// 都要查 —— 声明了不存在的文件，和放进来却没声明的文件。
const root = fileURLToPath(new URL("..", import.meta.url));

const declared = [
  ...readFileSync(`${root}src/css/vendor/fonts.css`, "utf8").matchAll(
    /url\(\.\.\/webfonts\/([^)]+)\)/g,
  ),
].map((m) => m[1]!);

const onDisk = readdirSync(`${root}static/webfonts`, {
  recursive: true,
  encoding: "utf8",
})
  .filter((f) => f.endsWith(".woff2"))
  .map((f) => f.replaceAll("\\", "/"));

describe("vendored fonts", () => {
  it("declares every file that ships", () => {
    expect(onDisk.filter((f) => !declared.includes(f))).toEqual([]);
  });

  it("ships every file it declares", () => {
    expect(declared.filter((f) => !onDisk.includes(f))).toEqual([]);
  });

  // 字体不按模板用量裁剪：完整分发是公开的创作面。数量变了要是有意的。
  it("ships the full distribution", () => {
    expect(onDisk).toHaveLength(18);
  });
});
