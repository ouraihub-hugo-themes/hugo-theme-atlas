// 模板的静态规则。不构建站点 —— 这些是读一遍源码就能判的事。
//
// 两条规则，同一个根因：**Hugo 的 `return` 不做控制流。**
//
// 它不是 Go 的 return。它设的是「这个 partial 的返回值」，而模板的执行与输出
// 都继续往下走。两种写法因此都是坏的：
//
//   1. 多个 return。Hugo 取它遇到的第一个，不管那个 return 在哪个逻辑块里、
//      条件是否成立。于是「几道前置条件各自 return」是假的 —— 第一道条件所在
//      的位置就定了返回值，后面几道都不参与。
//
//   2. return 之后还有输出。实测 `{{ if true }}{{ return }}{{ end }}` 之后的
//      标记照样渲染 —— 所以把 return 当 guard clause 用，得到的是「开关关着而
//      标记全在」。
//
// 两条都**不报错、不警告**，构建全绿，只是 partial 的行为与它读起来的样子
// 不一样。
//
// 规则 1 来自 edit-page.html：三个 return，站点没配仓库地址时本该什么都不输出，
// 实际每页发一条"URL 不能为空"的警告，因为第一道"没配就退出"从未生效。
//
// 规则 2 来自 search.html / palette.html / page-end.html：三处都用
// `{{ if not <开关> }}{{ return }}{{ end }}` 当前置条件，于是没开搜索的站点上
// 出现了一个点了没反应的搜索按钮、一个空的命令面板，而列表页上出现了四块只
// 对单页成立的页尾。

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
  const returns = [...code.matchAll(/\{\{-?\s*return\b[^}]*\}\}/g)];
  if (returns.length > 1) {
    failures.push(
      `${file}: ${returns.length} return statements; Hugo executes the first one it reaches ` +
        `regardless of its block, so the later conditions never run`,
    );
    continue;
  }

  // 规则 2。只有一个 return 时才判得准，所以上面那条命中就 continue 了。
  //
  // return 之后允许剩下的只有空白和 `{{ end }}` —— 那些 end 关的是包着这个
  // return 的块。除此之外的任何东西都是「return 之后的输出」，也就是那个
  // 不成立的 guard clause。
  const last = returns[0];
  if (!last) continue;
  const tail = code
    .slice(last.index + last[0].length)
    .replace(/\{\{-?\s*end\s*-?\}\}/g, "")
    .trim();
  if (tail.length > 0) {
    const shown = tail.length > 60 ? `${tail.slice(0, 60)}…` : tail;
    failures.push(
      `${file}: output follows the return; Hugo's return does not stop the template, ` +
        `so this renders anyway. Wrap the body in {{ if }} instead. Found: ${shown}`,
    );
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}

console.log(`ok  ${files.length} templates, no return used as control flow`);
