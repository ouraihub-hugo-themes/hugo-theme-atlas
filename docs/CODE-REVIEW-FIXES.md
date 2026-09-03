# 七维度评审的修复清单

评审日期 2026-09-03。维度：模块化、组件化、面向接口、面向对象、TS / Tailwind /
Hugo 主题最佳实践。

**结论：六项达标，面向对象一项不达标 —— 判为不该达标，理由在下面 §不修的。**
可改的三条都在本文，各自带一条能失败的检查。

> **三条已全部做完（2026-09-03）**，执行记录在文末。`pnpm check` 117 个用例过
> （原 103，两个新测试文件 +14），发布门 exit 0。

每条的格式是：现象 → 判据（怎么量出来的）→ 改法 → 验收。改完就地标 ✅，
**不删** —— 这份是评审的账，不是 `TODO.md` 那种「还剩什么」的清单。

## 达标的六项，量到了什么

| 维度 | 判据 |
|---|---|
| 模块化 | 25 个 TS 模块最大 221 行；43 个 CSS 文件基本一组件一份；102 个 partial 最大 169 行；跨模块 import 8 条无环 |
| 组件化 | 22 个 landing section **全部**走 `landing/keys.html`，21 走 `head.html`，14 走 `items.html`；一份 URL 策略 18 个调用点 |
| 面向接口 | 接口不在 TS `interface` 上，而是 Page Store 能力标记：shortcode 写 `hasMermaid`，`foot/js.html` 读它选 runtime，两侧互不认识 |
| TS | 0 个 `any` / `!.` / `@ts-ignore`；`strict` + `noUncheckedIndexedAccess`；16 处 `as` 全在 DOM 边界或经 `unknown` → 运行时校验 → `Partial<T>` |
| Tailwind | **0 个 `@apply`**；无 `tailwind.config.*`（v4 的 CSS-first）；13 个 `@utility`；逻辑属性 280 处对物理 left/right **0 处**；12 个 `!important` 全在 `@media print` 或 `prefers-reduced-motion` |
| Hugo | 唯一一份 `baseof.html`；`warnidf` + 有文档的回退，0 个 `errorf`；`validate-shortcode` 兜住拼错的参数名 |

## 任务

### 1. 五份手抄的懒加载 → 抽 `lazy-mount.ts`

**现象。** 同一段 `IntersectionObserver`（进视口 → `unobserve` → 挂载）在五个
runtime 里各抄了一份：

| 文件 | 行 | rootMargin | 回调 |
|---|---|---|---|
| `asciinema.ts` | 116–126 | 200px | `mount(host)` |
| `echarts.ts` | 215–228 | 400px | `render(host).then(ok => ok && watchSize(host))` |
| `markmap.ts` | 150–160 | 400px | `render(host)` |
| `mermaid.ts` | 109–119 | 400px | `render(host, hosts.indexOf(host))` |
| `openapi.ts` | 178–188 | 600px | `render(host)` |

**判据。** `Select-String -Pattern 'IntersectionObserver'` 命中 7 个文件，其中
`navbar.ts` 与 `scroll-spy.ts` 是另一种用法（常驻观察，不 unobserve），只有这
五个是「一次性懒挂载」。五个的 host 类型与回调形状一致，都是
`(host: HTMLElement) => unknown`。

**改法。** 新建 `src/ts/lazy-mount.ts`，导出一个函数收 hosts、rootMargin、
mount 回调。五处各换成一次调用。`rootMargin` 从散在五处的字面量变成调用点的
参数 —— 它本来就是每个 runtime 自己的决定，只是不该连观察器一起抄。

**验收。** 单测覆盖「进视口才挂载」「只挂一次」「hosts 为空不建观察器」三条；
`pnpm check` 与发布门过；`assets/dist/` 重建后 5 个 bundle 的字节数不异常增长。

**做的时候改了一处设计。** 第一版回调签名是 `(host, index)`，因为 mermaid 要给图
编号。量完字节数发现这让另外四个白付一次 `indexOf`：五个 bundle 各涨 64–82 字节。
改成只传 host、让 mermaid 自己 `indexOf`，降到各涨 31–49 字节。

| bundle | 原 | 现 | 差 |
|---|---|---|---|
| `asciinema.js` | 1509 | 1558 | +49 |
| `echarts.js` | 2762 | 2793 | +31 |
| `markmap.js` | 1652 | 1701 | +49 |
| `mermaid.js` | 1389 | 1433 | +44 |
| `openapi.js` | 2248 | 2297 | +49 |

**为什么抽出来反而变大**：五个是各自独立的 esbuild 入口、写到各自的目录，
`lazyMount` 内联进每一份而不是共享一个 chunk。合计约 220 字节，对着各自
80 KB–670 KB 的 runtime chunk 载荷。判为正常。

状态：✅ 已完成

### 2. `search.ts:84` `setExcerpt` 的清洗承诺比实现宽

**现象。** 注释声明「前提万一变了，代价是少一层高亮，**不是一个注入点**」。
实测 `<mark>` 元素**保留它带来的全部属性**，包括事件属性 —— 剥属性只是拆
非-mark 元素的副作用，`<mark>` 是原样放过的。

**这不是当前的漏洞。** 主防线核实过是真的：跑 `npx pagefind` 建索引、起站查
三个词，excerpt 里出现的标签只有 `mark` / `/mark`，正文里的 `<` 变成 `&lt;`。
所以「pagefind 转义了正文」成立，攻击者现在到不了这个函数。

问题只在**第二层防线没有兑现它自己声明的强度**，而这一层存在的全部理由就是
「前提万一变了」。浏览器实测（`page.evaluate`，不是推理）：

| 输入 | 输出 | 判定 |
|---|---|---|
| `<img src=x onerror=…>boom` | `boom` | 拆掉，属性随元素消失 ✅ |
| `<script>…</script>ok` | 脚本文本变成可见文字 + `ok`，未执行 | template 解析是惰性的 ✅ |
| `<svg onload=…><mark>m</mark></svg>` | `m` | 拆掉 ✅ |
| `<div><span><mark>deep</mark></span></div>` | `<mark>deep</mark>` | 嵌套里的 mark 存活 ✅ |
| `<mark onmouseover=… onclick=…>x</mark>` | **属性全部留下，两个处理器都真的触发** | ❌ |

**改法。** 拆非-mark 元素的同时，把留下来的 `<mark>` 的属性剥掉。mark 在这里
只承担高亮，不需要任何属性。

**验收。** 上表六种形状要有回归测试。**这里有个环境约束**：vitest 跑在没有
DOM 的 Node 环境里（见 §3 下面的说明），`document` 不存在，所以这条测试得自带
最小 DOM 替身或者换个测法 —— 不能只在浏览器里量一次就算完，那不是回归。

**怎么解的。** 把遍历抽成 `stripToMarks(elements)`（导出，收一个可迭代的元素
集合），`setExcerpt` 负责解析并调它。测试喂手写的树，八条用例，同
`markmap.test.ts` 一个路子。没装 jsdom / happy-dom / linkedom —— 确认过三个都
不在依赖里，而 Node 24 也不带 `DOMParser`。

**替身第一版是错的，值得记下来。** 我把文本存成元素的一个字段，于是
`replaceWith(...childNodes)` 拆掉元素时把文本一起丢了 —— 真实 DOM 里文本是
`childNodes` 里的一个 Text 节点，会被交回父级。两条断言挂在这上面。手写替身的
风险就是这个：**它可能在被测逻辑正确时失败，也可能在错误时通过。** 改成文本
建模成节点后过。

另一条断言也是我写错的：以为 `<script>` 应该整段消失，实际浏览器里量到的是
「脚本源码变成可见文字」，文档的表里本来就这么写。按实测改断言，没改实现。

**两侧都验了。** 单测：临时注掉剥属性那一行，恰好两条失败（「mark 自己带的属性
也要剥掉」「多个属性一次剥净」），恢复后 8 条过。浏览器：六种形状逐个塞进真
DOM 并主动 `dispatchEvent('mouseover')` + `click()`，`window.__fired` 是空数组 ——
改之前这里会打出 `mark-over` 与 `mark-click`。

状态：✅ 已完成

### 3. 四个 tsconfig 开关是免费的

**现象。** `exactOptionalPropertyTypes`、`noUnusedLocals`、`noUnusedParameters`、
`noImplicitReturns` 四个都没开。

**判据。** 逐个跑 `npx tsc --noEmit --<flag>`，四个都是 **0 错误**；四个一起开
也是 0 错误、exit 0。即代码已经达到了这四条标准，只是没把门关上。

`noPropertyAccessFromIndexSignature` 是 43 错，那是风格（强制 `obj["k"]`）不是
正确性，**不开**。

**改法。** 四个写进 `tsconfig.json`。

**验收。** `pnpm type-check` 仍然 exit 0。这条是纯门禁收紧，不改行为。

**门关上之后立刻拦了一次。** 新写的测试替身里有个
`constructor(public data: string)`，被 `erasableSyntaxOnly` 判 TS1294 —— 参数属性
是它禁的语法之一。这条不是这四个开关拦的，但同一次 `pnpm check` 里报出来的，
说明门禁在工作。改成显式赋值。

状态：✅ 已完成

## 不修的

### 面向对象：0 个 class，判为不该补

`src/ts` 里没有一个 `class`，而且 `tsconfig.json` 开了
`erasableSyntaxOnly: true` —— 从编译器层面禁掉 enum、namespace、参数属性。
全仓库唯一的 `class` 在 `tests/markmap.test.ts` 里，是手写的 DOM 替身。

不补的理由：这些模块的形状都是「给已经能用的 HTML 加增强」—— `init()` 找元素、
绑事件、退出，没有需要跨调用存活的对象身份。引入 class 得到的是
`new SearchPanel(el).mount()` 替代 `mount(el)`，多一层 `this`，少一次可摇树。

它真正做对的是另一件事：**把纯逻辑抽出来让它可测**。`reading-keys-model.ts`
是范例 —— `j`/`k` 的选择逻辑完全不碰 DOM，`readonly number[]`、
`delta: 1 | -1` 用字面量联合而不是 `number`，两个容差常数各自注明实测值
（`REACHED_SLACK = 8`，因为 `scrollIntoView` 后实测 `rect.top` 是 66.0625 而
阅读线是 66）。`palette-match.ts` 同样。这是面向接口的实质。

**所以：满足面向接口，不满足面向对象，而这个场景只需要前者。** 如果 OOP 是硬
指标，这个项目答不上；补的代价是真实的，收益说不出来。

### 8 个模块没测试：结构性的，不是疏漏

`clipboard` `drawer` `echarts-core` `navbar` `palette` `reading-keys`
`search-api` `share` 没有测试文件，其中 `palette.ts`（168 行）最显眼。

（评审时这里是 9 个，`search.ts` 因为任务 2 有了测试 —— 走的正是下面这条路：
把能测的那部分抽出去。它剩下的部分仍然没测。）

根因是 **vitest 跑在没有 DOM 的 Node 环境里**。`tests/markmap.test.ts` 顶部记了
这个决定：为五个 DOM 成员装一整个 jsdom 不值，于是手写最小替身。代价是纯 DOM
装配的模块测不了。

这解释了为什么 `palette-match` 和 `reading-keys-model` 有测试而 `palette` 和
`reading-keys` 没有 —— 可测的部分被抽出去测了，剩下的是接线。取舍成立：
`search.ts` 读过一遍，几乎全是 `createElement`，能抽的只有 `sub_results` 那次
filter/slice。

**但任务 2 正好是它的代价**：一个安全相关的函数因为环境没有 DOM 而没有回归
测试。所以任务 2 的验收特意要求「不能只在浏览器里量一次」。

**做完三条之后，对这个取舍的看法变了一点。** 手写替身在任务 2 里第一版是错的
（文本没建模成节点，见那一节），也就是说这条路**会**产生"替身与真实 DOM 不一致"
的失败模式，而那种失败可能是静默的 —— 替身错在被测逻辑不碰的地方时，测试照样绿。
两次都靠浏览器实测兜住了。所以这条取舍的真实代价不是"少几个测试"，而是
**每个替身都要有一次真实环境的交叉验证**。三条都做了，但这不能只写在提交信息里。

## 这次评审没覆盖的

- 30 个 shortcode 没逐个读（只读了 landing 的 22 节与被引用的共享 partial）
- 没跑无障碍工具（axe 之类）
- 102 个 partial 只读了最大的几个与涉及配置解析的那批

上面每条结论都有对应的测量，但覆盖面不是全量。

## 执行记录

按 3 → 2 → 1 的顺序做的：先关门（已证 0 错），再改一行加测试，最后动结构。

| 改了什么 | 文件 |
|---|---|
| 四个开关 | `tsconfig.json` |
| 抽出 `stripToMarks`，剥 mark 的属性 | `src/ts/search.ts` |
| 八条回归测试 + 手写 DOM 替身 | `tests/search-excerpt.test.ts`（新） |
| 一次性懒挂载 | `src/ts/lazy-mount.ts`（新） |
| 五处换成一次调用 | `asciinema.ts` `echarts.ts` `markmap.ts` `mermaid.ts` `openapi.ts` |
| 六条测试 + 手写 IntersectionObserver 替身 | `tests/lazy-mount.test.ts`（新） |
| 重建产物 | `assets/dist/` `static/js/` |

**两条检查各自验过会失败**（项目铁律：不会失败的检查不算检查）：注掉剥属性那
一行 → 恰好两条挂；去掉 `hosts.length === 0` 的早退 → 「不建观察器」那条挂。

**浏览器交叉验证**（五个 runtime 里验了三个有夹具的）：

| 页面 | 结果 |
|---|---|
| `docs/components/diagram/` | 4 个 mermaid：首屏内 2 个已渲染（宿主在 1027px，视口 953 + 400px 余量），滚动后第 3 个挂上；第 4 个是**故意写坏的夹具**（源码少一个右括号），保留源码正是设计 |
| `docs/components/chart/` | 9 个 echarts，逐屏滚完 9/9。**一跳到底只有 4 个** —— 中间的从未与视口相交，观察器当然不触发，不是缺陷 |
| `docs/components/mindmap/` | 3 个 markmap，3/3 |
| 同一 session 内 | 六种 excerpt 形状塞进真 DOM 并主动触发事件，`__fired` 为空 |

`asciinema` 与 `openapi` 只有单测与类型覆盖，没在浏览器里过 —— 两者与已验的三个
共用同一个 `lazyMount`，差别只在各自的 `mount` 回调，而那部分没动。

**浏览器工具的产物清掉了。** Playwright 又往工作树写了四个页面快照与控制台日志
（时间戳对得上这次的三次导航），列清单确认是本次产生的后删掉。这次顺手把
`.playwright-mcp/` 加进了 `.gitignore` —— 之前每轮靠手动清，清干净过，但那是运气
不是机制，漏一次就进提交。
