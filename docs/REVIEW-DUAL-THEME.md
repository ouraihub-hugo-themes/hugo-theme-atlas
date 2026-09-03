# 双版本方案评审（ponytail）

用 `ponytail-review` skill 审 2026-09-02 讨论中我提出的 Hugo + Astro 双版本方案。
只审过度设计，不审正确性与性能。

方案本身还没落地任何代码，所以"行号"对应到方案里的条目。

---

## 结论清单

| 条目 | 判定 | 处置 |
| --- | --- | --- |
| `packages/build/` 共享构建包 | `yagni` | 删。只有 Hugo 用 `build-ts.js`，Astro 用 Vite |
| `build-ts.js` 参数化输出路径 | `yagni` | 保持硬编码。split/flat 之分是 Hugo 资源管线独有的 |
| `runtime-map.js` 组件→运行时映射 | `delete` | 两侧谁都不消费这份数据 |
| `packages/contract/` 独立包 | `yagni` | 现有 `check-outputs.js` 加几行断言即可 |
| `docs/CONTRACT.md` | `delete` | 与 `DECISIONS.md` 重叠，合成一份 |
| `packages/core/` 四层目录 | `shrink` | 原地不动，Astro 侧用相对路径引 |
| 阶段 2「重组仓库」 | `yagni` | 为还没写的消费方重组，等骨架能跑再挪 |
| 阶段 4「骨架 + 契约测试」 | `shrink` | 断言等有东西可断言时再加 |
| i18n 适配层 | `native` | 直接读同一份 `en.yaml`，不写抽象层 |
| **双版本本身** | `yagni` | **等有人要再做** |

**net: -60 lines possible**（指方案里的层，不是产品代码）

---

## 三条要害

### 1. `packages/` 目录结构现在就是过度设计

我上一轮给了 `core/` `build/` `hugo/` `astro/` `contract/` 五个包。真实情况是
**Astro 版一行还没写**。为一个不存在的消费方重组 235 个文件，是先建抽象后找用途。

更省事：Astro 版起在 `astro/` 子目录，`src/ts` 与 `src/css` 用相对路径
`../src/ts` 引过去。跑通、确认真要长期维护两版，再谈抽包。

**抽包可逆，重组目录造成的 git 历史断裂不太可逆。**

### 2. 契约测试不需要新框架

`scripts/check-outputs.js` 已经在做这件事（构建六类页面验证
`data-pagefind-body` 覆盖）。而我提议建 `packages/contract/` + `CONTRACT` 数组
+ 两版遍历器 —— 把一个能用的脚本包装成框架。

加断言就是往那个文件里加几行 `if (!html.includes(...)) fail(...)`。等 Astro 版
真的存在、且真要跑同一批断言时，再抽。

### 3. 最该砍的是双版本本身

按 ponytail 阶梯第一问 —— **这个需要存在吗？**

- Hugo 版完成度很高，但**还没发布、没部署、没有用户**
- Astro 版的需求来自"我希望有"，不是"有人要"

成本是真实的：加一个 shortcode 写两遍，`VISUAL-REVIEW.md` 那 22 节跑两轮，
`diagrams.Goat` 在 Node 生态没有等价物会导致两版功能不对等。

**建议顺序**：先把 Hugo 版发布出去（Cloudflare Pages，约半小时）。有人用了、
有人问"有 Astro 版吗"，那时候再做 —— 而且那时你会知道他们真正要的是哪 10 个
shortcode，而不是全部 30 个。

---

## 唯一保留的建议

**`docs/DECISIONS.md` 不砍**，但只要一份（不要再拆出 `CONTRACT.md`）。

理由不是"为 Astro 版准备"，而是它现在就有用。

实例：`layouts/_partials/content/icon.html` 的注释里记录了跨文件
`<use href="...svg#id">` 在 Chrome/Safari 不解析、`getBBox()` 为 0 的完整实测。
我在这次视觉复核里花三轮探测"重新发现"了它 —— 答案早就写在那个模板里，我没读到。

这类知识散落在 151 个模板的注释中，对 Hugo 版自身的维护就是负债。集中出来，
与 Astro 做不做无关。

候选内容（都来自现有注释）：

- `<use>` 必须同文档引用 + `td-i-` 前缀躲开标题锚点的 id 碰撞
- `data-pagefind-body` 漏标会静默排除整类页面，构建全绿
- 模板里拼接的类名 Tailwind 扫不到
- 数学只出 MathML，不出 `htmlAndMathml`（后者拖来 1.5 MB 字体）
- markmap 从 DOM 走树，省掉 656 KB 的解析器
- 带过渡的属性会读到中间值（`VISUAL-REVIEW.md` 里记的那四次）

---

## 附：仍然成立的技术判断

评审没有推翻这两条，它们与"要不要做"无关，是"真做了会怎样"：

**Shiki 不适合 Hugo 侧。** 会引入消费方 Node 依赖（违反 `PLAN.md` 里
"pagefind 是唯一一处"的原则）、破坏 `gen-chroma.js` 的纯 CSS 深浅色门控、
需要重写 `lntable` 与软换行的互斥判断。两版高亮配色分叉是正确答案，不是妥协。

**共享的应该是契约而非实现。** 代码块的契约是 DOM 结构与四个属性的行为；
高亮器用 Chroma 还是 Shiki 是实现细节。同理适用于数学、图标、能力标记。
