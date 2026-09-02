// 模板的静态规则。不构建站点 —— 这些是读一遍源码就能判的事。
//
// 现在只有一条：一个 partial 里最多一个 `return`。
//
// Hugo 的 `return` 不是 Go 的 return。它执行**遇到的第一个** return，不管那个
// return 在哪个逻辑块里、条件是否成立。于是这个写法：
//
//   {{ if not $a }}{{ return }}{{ end }}
//   {{ if not $b }}{{ return }}{{ end }}
//   ...真正的输出...
//
// 看起来是两道前置条件，实际是「第一道条件所在的位置就结束」——两个条件都不
// 求值，后面的输出永远不出。而**构建是绿的**：没有报错，没有警告，只是那个
// partial 的行为与它读起来的样子不一样。
//
// 这条规则来自一次真实的回归：edit-page.html 写了三个 return，站点没配仓库
// 地址时本该什么都不输出，实际却每页发一条"URL 不能为空"的警告 —— 因为第一道
// "没配就退出"的检查从未生效。

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "layouts";

/** 递归收集 .html。 */
function templates(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...templates(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

const files = templates(ROOT);
if (files.length === 0) {
  console.error(`${ROOT} has no templates`);
  process.exit(1);
}

const failures = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  // 注释里的 `return` 不算。Hugo 的注释是 `{{/* ... */}}`，先整段去掉。
  const code = text.replace(/\{\{-?\s*\/\*[\s\S]*?\*\/\s*-?\}\}/g, "");
  const count = [...code.matchAll(/\{\{-?\s*return\b/g)].length;
  if (count > 1) {
    failures.push(
      `${file}: ${count} return statements; Hugo executes the first one it reaches ` +
        `regardless of its block, so the later conditions never run`,
    );
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log(`ok  ${files.length} templates, none with more than one return`);
