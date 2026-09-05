// 构建脚本自己的平台假设。
//
// 这一类缺陷的形状：作者机器全绿，CI 红，而红的那条与改动无关。它绕过了其余所有
// 门禁 —— 318 条 warn 管作者输入，产物门禁管源码与产物一致，没有一条管**脚本自己
// 跑在什么文件系统上**。
//
// 已经发生过一次：`gen-vendor.js` 按候选名逐个 `existsSync` 找许可文件，
// `LICENSE.txt` 在 NTFS 上命中了磁盘上的 `license.txt`（大小写不敏感），ext4 命中
// 不了。作者机器 `--check` 绿，CI 报 NOTICES.md 不匹配，缺的是一整段 MIT 正文 ——
// 分发合规的实际缺口，不是格式噪音。
//
// 验的是**行为**而不是源码形状。静态匹配在这里行不通：危险写法是
// `existsSync(join(dir, n))`，文件名来自候选数组里的变量，正则配不出那对关系
// （我先写了一版正则门禁，把历史 bug 放回去它照样绿）。所以直接建一批真文件，
// 问被测函数选了哪个 —— 大小写不敏感的实现会在这里露出来。
//
// 用法：node scripts/check-platform.js

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { findFile } from "./lib/find-file.js";

const failures = [];
const checks = [];

const tmp = mkdtempSync(join(tmpdir(), "atlas-platform-"));
try {
  // ---- 1. 大小写无关的文件查找 ----
  //
  // 每个用例：磁盘上放什么、候选名是什么、期望选中谁。用例本身对两种文件系统都
  // 成立 —— 不建只靠大小写区分的两个文件（那在 NTFS 上根本建不出来）。
  const cases = [
    { disk: ["license.txt"], want: ["LICENSE", "LICENSE.txt"], expect: "license.txt", why: "@iconify/utils 的真实形状，就是这条让 CI 红过" },
    { disk: ["LICENSE"], want: ["LICENSE", "LICENSE.txt"], expect: "LICENSE", why: "最常见的一种，201 个包这么写" },
    { disk: ["LICENCE"], want: ["LICENSE", "LICENCE"], expect: "LICENCE", why: "英式拼写，store 里有 2 个" },
    { disk: ["readme.md"], want: ["LICENSE"], expect: null, why: "没有许可文件时必须返回 null，不能拿别的文件顶上" },
    { disk: ["LICENSE.md", "LICENSE"], want: ["LICENSE", "LICENSE.md"], expect: "LICENSE", why: "两个都在时按候选表的优先级，不按目录顺序" },
  ];

  for (const [i, c] of cases.entries()) {
    const dir = join(tmp, `case-${i}`);
    mkdirSync(dir, { recursive: true });
    for (const n of c.disk) writeFileSync(join(dir, n), `${n} body\n`);
    const got = findFile(dir, c.want);
    checks.push(`findFile: ${c.why}`);
    if (got !== c.expect) {
      failures.push(
        `findFile(${JSON.stringify(c.disk)}, ${JSON.stringify(c.want)}) 返回 ${JSON.stringify(got)}，` +
          `应当是 ${JSON.stringify(c.expect)} —— ${c.why}`,
      );
    }
  }

  // 目录不存在时返回 null 而不是抛：调用方问的是"有没有这个文件"。
  checks.push("findFile: 目录不存在时返回 null 而不抛");
  if (findFile(join(tmp, "nope"), ["LICENSE"]) !== null) {
    failures.push("findFile 在目录不存在时没有返回 null");
  }

  // ---- 2. 嵌上游正文的生成器必须归一化行尾 ----
  //
  // 上游许可文件里有一多半是 CRLF（echarts、dompurify 都是），而 `.gitattributes`
  // 的 `eol=lf` 让工作树里是 LF。原样嵌进去的话新克隆上 `--check` 一定红：磁盘上
  // 是 LF，重新生成出来是 CRLF。这一条已经修过，门禁在这里钉住它。
  //
  // 验的是**已提交的产物本身**不含 CRLF —— 那是"生成器归一化了"唯一可观察的证据，
  // 比检查源码里有没有 replaceAll 可靠（换一种归一化写法不该让门禁红）。
  for (const out of ["NOTICES.md", "VENDOR.json"]) {
    checks.push(`${out}: 不含 CRLF`);
    const raw = readFileSync(out, "utf8");
    const crlf = (raw.match(/\r\n/g) ?? []).length;
    if (crlf > 0) {
      failures.push(
        `${out} 含 ${crlf} 处 CRLF；它嵌了上游正文，而上游有一多半是 CRLF —— ` +
          `生成时要 replaceAll("\\r\\n", "\\n")，否则新克隆上 --check 必红`,
      );
    }
    // 裸 CR 更隐蔽：归一化只处理 \r\n 的实现会把它留下。
    checks.push(`${out}: 不含裸 CR`);
    if (/\r(?!\n)/.test(raw)) {
      failures.push(`${out} 含裸 CR（不是 CRLF 的一部分）；归一化漏了这一种`);
    }
  }

  // ---- 3. 生成的文本里不能有本机绝对路径 ----
  //
  // pnpm 的 store 路径进了输出的话，换台机器重新生成就不一致，而 --check 只在
  // 原作者机器上绿。VENDOR.json 的注释明确说了不写路径，这里钉住它。
  for (const out of ["NOTICES.md", "VENDOR.json"]) {
    checks.push(`${out}: 不含本机绝对路径或 .pnpm 路径`);
    const raw = readFileSync(out, "utf8");
    const hits = [...raw.matchAll(/[A-Za-z]:[\\/](?:Users|workspace)|\/(?:home|Users)\/[a-z]|node_modules\/\.pnpm\//g)];
    if (hits.length > 0) {
      failures.push(`${out} 含本机路径：${[...new Set(hits.map((h) => h[0]))].join("、")} —— 换台机器生成就不一致`);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const f of failures) console.error(`FAIL  ${f}`);
  process.exit(1);
}

console.log(`ok  ${checks.length} platform assumption(s) hold on this filesystem`);
