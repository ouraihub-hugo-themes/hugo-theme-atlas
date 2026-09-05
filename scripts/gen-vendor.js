// VENDOR.json 生成器：列出真正进了发布产物的第三方包。
//
// 消费者克隆这个仓库直接用，不装 Node —— 因此 `static/js/` 下 148 个 bundle
// 文件是**再分发**，MIT 与 Apache-2.0 都要求许可文本与版权声明随之附带。
// `pnpm-lock.yaml` 记的是构建这份产物用过的整棵依赖树（含 eslint、vitest
// 一类只在开发时跑的东西），不是被分发的那一部分。
//
// 因此包名不从 package.json 抄，而是问 esbuild 的 metafile —— 它记的是每个
// bundle 的真实输入文件，那才是"哪些第三方代码在产物里"的地面事实。手抄的
// 那份 CSS 不经过 esbuild，单独列出。
//
// 同时生成 NOTICES.md：MIT 与 Apache-2.0 都要求分发时附带许可文本与版权声明，
// Apache-2.0 §4(d) 还要求把上游的 NOTICE 传下去。VENDOR.json 是机器读的清单，
// NOTICES.md 是履行那个要求的那份文本。主题自己的许可在 LICENSE。
//
// 用法：node scripts/gen-vendor.js [--check]
//   --check 只比对不写：产物变了而这两份没跟着更新时以非零退出。

import { build } from "esbuild";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const OUT = "VENDOR.json";
const NOTICES = "NOTICES.md";
const ENTRIES = ["mermaid", "asciinema", "echarts", "markmap"].map((n) => `src/ts/entries/${n}.ts`);

// 手抄进仓库的产物，不经过 esbuild。
//
// 记的是**上游文件**的校验和，不是仓库里那份的 —— 仓库里那份顶上加了一段说明
// 头，字节不同。上游校验和回答"抄的是不是那个版本的那些字节"，而本地文件被改
// 动这件事 git 已经在管了。
const COPIED = [
  {
    path: "src/css/vendor/asciinema-player.css",
    from: "asciinema-player",
    upstream: "dist/bundle/asciinema-player.css",
  },
];

/**
 * 从 metafile 的输入路径认包名与包目录。
 *
 * 认**最后**一个 `node_modules/`：pnpm 是虚拟 store，传递依赖的路径形如
 * `node_modules/.pnpm/d3-array@3.2.4/node_modules/d3-array/src/bisect.js`——
 * 认第一个只会得到 `.pnpm`。目录一并返回，因为传递依赖在顶层没有软链，
 * version 与 license 只能从这个嵌套路径里读。
 */
function packageOf(file) {
  const path = file.replaceAll("\\", "/");
  const at = path.lastIndexOf("node_modules/");
  if (at < 0) return null;
  const rest = path.slice(at + "node_modules/".length).split("/");
  // @scope/name 占两段。
  const parts = rest[0].startsWith("@") ? rest.slice(0, 2) : rest.slice(0, 1);
  if (parts.length === 0) return null;
  return { name: parts.join("/"), dir: path.slice(0, at + "node_modules/".length) + parts.join("/") };
}

// 许可文件的常见名字。有些包（khroma）不写 package.json 的 license 字段，
// 只放一个文件 —— 合规文档里留 "?" 等于没记。
//
// 匹配不区分大小写，因为 store 里这个名字有 13 种写法（LICENSE、license、
// license.txt、LICENCE…）。逐个 existsSync 探测在 Windows 上会"意外成功"：
// NTFS 大小写不敏感，`LICENSE.txt` 能命中磁盘上的 `license.txt`，Linux 命中
// 不了 —— 那时同一次提交在作者机器上绿、在 CI 上红，@iconify/utils 正是这样。
const LICENSE_FILES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "COPYING"];
const NOTICE_FILES = ["NOTICE", "NOTICE.txt", "NOTICE.md"];

/**
 * 在目录里按名字找文件，不区分大小写。命中返回磁盘上的真实文件名。
 *
 * 读一次目录再比，而不是对每种大小写写法各探测一次：后者在两种文件系统上
 * 结果不同，而这份输出要在两边逐字节相同。
 */
function findFile(dir, names) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  for (const want of names) {
    const hit = entries.find((e) => e.toLowerCase() === want.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

/**
 * 从许可文件正文认 SPDX 标识。
 *
 * 只认几个明确的头部字样，认不出就返回带文件名的 "see <file>" —— 猜一个
 * SPDX id 比承认认不出更糟：合规文档里一个错的标识会被下游直接采信。
 */
function licenseFromFile(dir) {
  const name = findFile(dir, LICENSE_FILES);
  if (!name) return "?";
  const head = readFileSync(join(dir, name), "utf8").slice(0, 400);
  if (/MIT License/i.test(head)) return "MIT";
  if (/Apache License/i.test(head)) return "Apache-2.0";
  if (/ISC License/i.test(head)) return "ISC";
  if (/BSD/i.test(head)) return "BSD";
  return `see ${name}`;
}

/** 读包的 version 与 license。 */
function manifest(dir) {
  const path = join(dir, "package.json");
  if (!existsSync(path)) return null;
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  return {
    version: pkg.version ?? "?",
    // licenses[] 是废弃字段，但老包还在用，读它比输出 "?" 有用。
    license: pkg.license ?? pkg.licenses?.[0]?.type ?? licenseFromFile(dir),
  };
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * 许可与 NOTICE 的正文。找不到就返回 null，NOTICES.md 里记声明值。
 *
 * 行尾统一成 LF。上游许可文件里有一多半是 CRLF（echarts、dompurify 都是），
 * 而 `.gitattributes` 的 `eol=lf` 让工作树里是 LF —— 原样嵌进去的话新克隆上
 * `--check` 一定红：磁盘上是 LF，重新生成出来是 CRLF。
 */
function texts(dir) {
  const read = (names) => {
    const name = findFile(dir, names);
    if (!name) return null;
    return { name, body: readFileSync(join(dir, name), "utf8").replaceAll("\r\n", "\n").trimEnd() };
  };
  return {
    license: read(LICENSE_FILES),
    // Apache-2.0 §4(d)：上游给了 NOTICE，分发时要带着。
    notice: read(NOTICE_FILES),
  };
}

const result = await build({
  entryPoints: ENTRIES,
  bundle: true,
  format: "esm",
  target: "es2022",
  splitting: true,
  // 不落盘：这里只要 metafile。
  write: false,
  outdir: "/tmp/atlas-vendor-meta",
  metafile: true,
  logLevel: "silent",
});

// 949 个输入文件收敛到包一级。
const dirs = new Map();
for (const input of Object.keys(result.metafile.inputs)) {
  const found = packageOf(input);
  if (found) dirs.set(found.name, found.dir);
}

// 包目录另存一份：VENDOR.json 里不写路径（那是本机的 pnpm store 位置，换台
// 机器就不对），但收许可正文要用它。
const dirOf = new Map();

const bundled = [...dirs.keys()].sort().map((name) => {
  const dir = dirs.get(name);
  const m = manifest(dir);
  if (!m) throw new Error(`${name} is in the bundle but has no readable package.json`);
  dirOf.set(name, dir);
  return { name, version: m.version, license: m.license, form: "bundled" };
});

const copied = COPIED.map((entry) => {
  const dir = join("node_modules", entry.from);
  const m = manifest(dir);
  if (!m) throw new Error(`${entry.from} is not installed; cannot record ${entry.path}`);
  const upstream = join(dir, entry.upstream);
  if (!existsSync(upstream)) throw new Error(`${entry.from}@${m.version} has no ${entry.upstream}`);
  const digest = sha256(upstream);
  // 本地那份的正文必须就是上游那份。这条会失败的情形：升级了包但忘了重新
  // 复制文件 —— 那时 VENDOR.json 记的版本是新的，仓库里的样式还是旧的。
  //
  // 不抛：这是合规检查的一条失败，读的人要的是一行说清怎么修，不是栈回溯。
  if (!readFileSync(entry.path, "utf8").includes(readFileSync(upstream, "utf8").trimEnd())) {
    console.error(`FAIL  ${entry.path} is not a copy of ${entry.from}@${m.version}`);
    console.error(`      re-copy node_modules/${entry.from}/${entry.upstream} and update its header`);
    process.exit(1);
  }
  dirOf.set(entry.from, dir);
  return {
    name: entry.from,
    version: m.version,
    license: m.license,
    form: "copied",
    path: entry.path,
    upstream: entry.upstream,
    sha256: digest,
  };
});

const doc = {
  comment:
    "第三方代码在这个仓库的发布产物里的完整清单。bundled 的进 static/js/ 与 " +
    "assets/dist/（由 esbuild 从 node_modules 打出，提交是因为消费者不装 Node）；" +
    "copied 的是手抄进仓库的文件。用 node scripts/gen-vendor.js 重新生成，" +
    "--check 在 CI 里验证它与产物一致。",
  entries: [...bundled, ...copied],
};

const json = JSON.stringify(doc, null, 2) + "\n";

// 一个包一节：声明的许可、上游的许可正文、以及 NOTICE（如果有）。同名同版本
// 只出现一次 —— asciinema-player 既 bundled 又 copied，许可是同一份。
const seen = new Set();
const sections = [];
for (const entry of doc.entries) {
  const key = `${entry.name}@${entry.version}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const { license, notice } = texts(dirOf.get(entry.name));
  const lines = [`## ${key}`, "", `许可：${entry.license}`, ""];
  if (license) {
    lines.push("```text", license.body, "```", "");
  } else {
    // 上游没带文件时只能记它自己声明的值。写明这件事，别让读的人以为漏抄了。
    lines.push(`上游未附带许可文件；以上是它在 package.json 里声明的值。`, "");
  }
  if (notice) {
    lines.push(`### NOTICE`, "", "```text", notice.body, "```", "");
  }
  sections.push(lines.join("\n"));
}

const notices = [
  "# 第三方许可",
  "",
  "这个仓库的发布产物里含有下列第三方代码。MIT 与 Apache-2.0 都要求分发时附带",
  "许可文本与版权声明，Apache-2.0 §4(d) 还要求把上游的 NOTICE 传下去 —— 这份",
  "文件就是那个要求的履行。",
  "",
  "主题自己的许可是 Apache-2.0，见 `LICENSE`。机器可读的清单在 `VENDOR.json`。",
  "**这份文件由 `scripts/gen-vendor.js` 生成，不要手改。**",
  "",
  ...sections,
].join("\n");

const outputs = [
  [OUT, json],
  [NOTICES, notices],
];

if (process.argv.includes("--check")) {
  const stale = outputs.filter(([path, want]) => (existsSync(path) ? readFileSync(path, "utf8") : "") !== want);
  if (stale.length > 0) {
    for (const [path] of stale) console.error(`FAIL  ${path} does not match the built output`);
    console.error("run: node scripts/gen-vendor.js");
    process.exit(1);
  }
  console.log(`ok  ${OUT} and ${NOTICES} match ${doc.entries.length} third-party entries in the shipped output`);
} else {
  for (const [path, body] of outputs) writeFileSync(path, body);
  console.log(`wrote ${OUT} (${doc.entries.length} entries) and ${NOTICES} (${sections.length} packages)`);
}
