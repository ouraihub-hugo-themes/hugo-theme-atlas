# 规划：实施分期

**要知道还剩什么，读 `TODO.md`，不要读这份。** 这份是分期计划：怎么做、什么
顺序、每期怎么算完，以及每个「不做」的理由。已完成的期次留在这里是为了保住
那些理由，不是待办。

前置阅读 `HANDOFF.md`（环境与陷阱）。

**进度**：期 0–6 ✅，路线图走完。剩下的是视觉判断，见 `TODO.md`。

## 铁律

1. **每期结束必须可 `pnpm build` 产出可浏览站点。** 不接受「下一期才能跑」。
2. **每期结束必须过 RTL / forced-colors / reduced-motion / print 四项检查。**
   这四项不进「后期统一处理」，欠一期就永远补不上。
3. **产物（`assets/dist/`）单独 commit**，与源码改动分开。
4. **这三样不要**：断言源码字符串的测试（改个换行就红）、每个检查器各起一次
   hugo 构建（跑一轮几分钟）、一次性迁移工具（没有消费方需要迁移）。

## 期次

### 期 0 · 地基（空骨架，不含任何组件）✅

产出一个能跑的空主题骨架。

- `package.json`（pnpm，esbuild + tailwindcss 4.3 + vitest）
- `tsconfig.json`、`eslint.config.js`、`.stylelintrc.json`
- `src/css/theme.css`：`@theme` token 层 —— **本期最重要的交付**
- `src/ts/entries/*.ts` 入口 + esbuild 到 `assets/dist/`

  源在 `src/`、产物在 `assets/dist/`：两者同名会让 `resources.Get` 拿到源
  文件，把 `@import "tailwindcss"` 当样式表发给浏览器 —— 静默失败，整站
  无样式。
- `layouts/baseof.html` + 一个最小 `docs` 外壳
- `hugo.toml`、`go.mod`、`theme.toml`
- CI：一次 hugo 构建 → 所有检查消费同一产物（拓扑从第一天定对）

**验收**：`pnpm build` 出站，一个页面正确渲染，Tailwind 类生效，
`pnpm type-check` / `lint:ts` / `lint:css` 全绿。

**风险点**：token 层设计错了后面每期都要返工。这一期宁可慢。

### 期 1 · token 与排版 ✅

单层 `@theme` token，不做「CSS 变量 + 预处理器变量」的双层。

- 颜色（含 light/dark 双主题、`data-td-*` 属性选择器）
- 排版预设 technical / system，无效值 warn+fallback
- 字体：搬 3 组 vendored 字体（inter 14 子集 / ibm-plex-mono 3 / chakra-petch
  1，共 18 个 woff2），**不裁剪**；`tests/fonts.test.ts` 双向盯住表与文件
- Markdown 正文样式：完整标题标尺 + 层级间距

**验收**（已过，这些就是标尺的定义值）：h1 36px/700/Inter/-0.9px/41.4px、
h2 24px/600/mt-48px、h3 20px/mt-36px、正文 16px/27.2px、lead 18px/400；
深浅色代码块 `#fff` / `#0a0f16`（github 灰已覆盖）；RTL 引用条与列表缩进
翻面；三条预设路径 + `--panicOnWarning` 发布门全验。

**两处有意的选择**：

1. 正文标题字族是 Inter，不是 Chakra Petch。后者只出现在 navbar brand、
   footer、landing hero、markers 这些 chrome 位上 —— 一整页正文标题用
   display 字族会盖过正文本身。
2. 不用 `@tailwindcss/typography`。它自带一套标尺，装了要逐项覆盖成上面那些
   值，净增一个依赖。`@utility td-prose` 里直接写这些值更短。

**本期踩到的坑**（计入期 2 的重估）：`--color-code-bg` 引用了不存在的
token → 代码块静默落回 Chroma 自带的 github 灰。Tailwind 的 `@theme`
不校验引用，写错变量名不报错。

### 期 2 · 阅读外壳 ✅（宽度拖拽 ⏸ 有意推迟，见段末）

4 个外壳 + 导航。这是主题的骨架，也是 B 级难度最集中的一期。

**已完成并浏览器验证**：

- ✅ `docs` 壳：一个 grid + 修饰类承载侧栏/TOC 的有无（`src/css/shell.css`、
  `layouts/baseof.html`）。实测 1440px 三列 `286px 770px 256px`、
  929px 两列 `268px 597px`、700px 单列。
- ✅ 侧栏递归树（`_partials/shell/sidebar-node.html`）：原生 `<details>`
  折叠，祖先链默认展开，当前行底色 accent 14%。
- ✅ 窄屏抽屉（`src/ts/drawer.ts`）：焦点陷阱、Escape、`inert` 背景惰性、
  滚动锁、断点跨越清理。LTR/RTL 各两态实测正确。
- ✅ TOC（`_partials/shell/toc.html`）+ scroll-spy（`src/ts/scroll-spy.ts`）：
  7/7 可达标题命中，到底选末项，不可滚文档高亮首节。
- ✅ navbar（`src/css/navbar.css`、`_partials/shell/navbar.html`）：50px、
  `sticky`、`z-index 100`、`blur(8px)`，底色与阴影按 token 值验过。菜单读
  `[[menu.main]]`，未配置退回顶层 section。
- ✅ 主题切换按钮（`_partials/shell/theme-toggle.html`）：此前
  `theme-toggle.ts` 一直没有元素可挂，深浅色只能跟系统。
- ✅ breadcrumb、顺序 pager、footer（`src/css/page-nav.css`、`footer.css`）。
- ✅ 侧栏折叠状态持久化（`src/ts/sidebar-nav.ts`）：节点身份用
  `data-td-nav-key="{{ RelPermalink }}"`。**存储只加不减地作用于恢复**——
  只打开、绝不关闭，因为服务端每翻一页都会重新展开当前那条祖先链，让存储
  覆盖它会导致读者正在读的 section 自己收起来。四种组合浏览器逐条验过。
- ✅ 两个 baseof 合并成一份：修饰类承载差异，不再整体替换。

**剩余**：

- ✅ `book` / `blog` / `swagger` 三壳 + `params.ui.shell_types` 扩展点。
  四壳共用一份 baseof，实际差异只有一个标记类与 `reading_width` ——
  见 `shell/resolve.html`。给每个壳各留一份 baseof 的代价是外壳级改动要改
  四处，而 Hugo 的 baseof 变体是整体替换，漏改一处不报错。
- ⏸ 侧栏宽度拖拽 —— **有意推迟**。三个 token（`--td-shell-sidebar-w` /
  `-min` / `-max`）已就位，桌面端宽度够用；而拖拽要引入指针捕获、双向 RTL、
  键盘等价操作和又一份持久化状态，成本约等于期 3 里一个带外部 runtime 的
  组件，收益只是"能调 268px 到 480px"。等有人真的要求再做。

**验收**：四壳均可浏览；scroll-spy 命中到底选末项、不可滚文档高亮首节；
键盘可达；窄屏/RTL 正常。

### 期 3 · 内容原语 ✅

原计划 29 shortcodes + 18 render hooks。**交付实测：shortcode 30、hook 15。**

两个数都与原计划不符，都是原计划错了而不是这里欠了。shortcode 多一个，因为
`book-*` 那组按用途拆成了四个（equations / examples / figures / tables）而计划
把它们算作一格。hook 少三个，因为计划里有五项是 shortcode 与 hook 重复计数
（`filetree` `gallery` `checksums` `math` `chem` 只是 hook，不是两者），
而 `render-table.rss.xml` 这类输出变体计划没单列。下面两段是当时纠正的原文。

**`filetree` `gallery` `checksums` `math` `chem` 不是 shortcode**，五个都是
`render-codeblock-<lang>.html` hook —— 原先把它们列进 shortcode 那一格是错的。

**`math`/`chem`/`eq` 也不带外部运行时** —— 第二处纠正。`transform.ToMath` 是
Hugo 内建的 KaTeX，公式在构建时就渲染完，没有浏览器运行时可等、可下载、可
联网。原先把它们排进第 6 批是**假定数学一定要装浏览器端 KaTeX**，没有先查
Hugo 有没有内建。已交付。

| 批次 | 内容 |
|---|---|
| 提示框 | `render-blockquote-alert` + 图标 sprite（11 类 callout） |
| 表格 | `render-table`：滚动包裹、caption、matrix 粘连表头、full-width |
| 图片 | `render-image`、`figure`：固有尺寸、链接、共享 URL 策略 |
| 代码 | `render-codeblock`：标题栏、复制、折叠 |
| 卡片 | `cards`/`card` |
| 步骤 | `steps`（两种作者形式） |
| 标签页 | `tabs`/`tab`：分组同步、深链、持久化、键盘导航 |
| 行内标记 | `kbd`（位置参数 + 朗读版分隔符）、`badge`（5 tone） |
| 参数回显 | `param`：仅标量、htmlEscape、页面→站点回落 |
| 交叉引用 | `fig`/`tbl`/`eg`/`xref` + 四个列表；登记器与三张 Store 表 |
| 目录树 | `book-toc`：根同侧栏，有序列表 |
| 字段表 | `field`/`fields`：`dl` 语义，锚点按 slug 计数去重 |
| 引入与注释 | `include`（复用代码块 hook）、`comment`、`contributors` |
| 发布 | `release-card`/`release-assets`：算法按长度判断，截断+完整两份校验和 |
| 下载区 | `download`：三层校验，rolling/pinned 三处差异 |
| 静态围栏 | `filetree`（构建时算列宽）、`gallery`、`checksums` |
| 数学 | `math`/`chem`/`eq`/`render-passthrough`：内建 KaTeX，只发 MathML |
| 图表 | `mermaid`（代码分割 + 进视口才 import）、`goat`（内建，构建时 SVG） |
| UML | `plantuml`：`~h` 十六进制 URL，零 JS，默认关着 |

**本期建立的三件共享设施**（后续 24 个 shortcode 直接复用，不再重复造）：

- `layouts/_partials/validate-shortcode.html` —— 参数校验。Hugo 会**静默
  忽略**认不出的参数，所以未知参数必须自己 warn，否则作者看到的是"我写的
  `titel` 没生效"。
- `layouts/_partials/content/render-block.html` —— shortcode body 的渲染入口。
  用 Page Store 传作用域前缀给脚注去重，不做「渲染完再正则改 id」那一套。
- `scripts/check-warnings.js` + `tests/invalid/*.md` —— 非法输入的断言夹具。
  在临时站点里构建，断言每个 `expect:` 列出的警告都出现。**发布门仍要求
  `--panicOnWarning` 绿**，所以这些夹具不能放在 `exampleSite/`。

**剩余子批次**：

1. ✅ 标记类：`badge` `kbd`、`param`。**这一批原先
   还列着 `eq` `fig` `xref` `tbl` `eg` `field`/`fields`，那是错的** —— 见下面
   第 2 批的说明，它们已挪走。
2. ✅ **交叉引用体系**（原「Book」批，范围已修正）：`fig` `tbl` `eg` `xref` +
   四个列表 + `book-toc`，以及 `eq`。

   原计划把前五个当"几行的标记包装"排进第 1 批，把后五个单独排一批。设计过
   之后这个切法不成立：`fig`/`tbl`/`eq`/`eg` 每个都往 Page Store 的
   `tdBookTargets` / `tdBookTargetNums` / `tdBookTargetOrder` 三张表登记，
   `xref` 查这些表，`book-*` 五个列表也读同一批表。登记器（含重复 id 与重复
   编号两种诊断）、`validate-num`、`validate-id`、`label` 四件共享设施必须先
   立起来，任何一个组件才能写。**一个体系，不是两批标记**，按登记器 → 四个
   目标 → `xref` → 五个列表的顺序做。

   共享设施：`book/register-target.html`（三张 Store 表 + 重复 id / 重复编号
   两种诊断）、`book/target-head.html`（num/id/caption/class 四项校验）、
   `book/validate-num.html`、`book/validate-id.html`、`book/label.html`、
   `book/figure-list.html`、`book/toc-tree.html`。`eq` 只加了 `--eq` 那套
   grid 版式，登记走的是同一条路 —— 块级 `$$` 带 `{num=…}` 也登记，两种写法
   在交叉引用表里没有区别。

   两处放宽了输入，理由在提交信息里：`validate-id` 不限 ASCII（否则拒掉 Hugo
   从 CJK 标题生成的锚点）；`book-toc` 的 `depth` 收数字字符串（`depth="2"` 是
   作者的明确意图，不是错误）。
3. ✅ `field`/`fields`：只加了一个新 partial
   （`content/field-anchor.html`）—— 单调用方的 `fields-list` / `field-meta`
   直接内联，锚点去重用 Page Store 计数器而不是逐个探测占用。
4. ✅ 结构类，拆成三批交付。**原先把它当一批是估错了**：`download` 那条线
   连带 `release-*` 是 1060 行、15 个 partial 的发布元数据子系统，与
   `comment`（3 行）不属于同一个量级。
   - `include` `comment` `contributors`。`include` 复用代码块 hook，
     围栏长度按内容算；`comment` 里取 `.Inner` 必须写成 `{{ if false }}` 包着
     的形式（静态扫描决定能否成对调用，真取值会让注释掉的 shortcode 跟着跑）。
   - `release-card` `release-assets` + `release/meta.html`。校验和算法
     按十六进制长度判断；剪贴板从 `code.ts` 抽成 `clipboard.ts`（第二个调用方
     出现了才抽）。
   - `download` + 6 个 partial。校验分三层，拆分线是"错了赔多少"。
5. ✅ 静态围栏：`filetree` `gallery` `checksums`。**原先列了五个，
   `math`/`chem` 挪走了** —— 当时判断它们属于"带外部运行时"那一类。这个判断
   本身也是错的（见下一批），它们同样是静态围栏，只是单独交付。

   `filetree` 的名字列宽必须在构建时算出来：注释靠 grid 第一列对齐，而每层
   嵌套是独立的 `<ul>`（独立 grid 容器），`max-content` 跨不过去，subgrid 又
   要求所有行同容器。

   三处有意简化：图标表按图标分组而非铺一百多行扩展名（那张平表只落到约 25 个
   不同图标上）；不做名字/注释分割线拖拽（与侧栏拖拽同一类成本）；不做点击
   放大（`link=` 已经够）。

   顺带修了资产表在窄屏让整页横滚 32px 的问题 —— `position: absolute` 的后代
   找不到定位祖先就逃出滚动壳的裁剪，给壳加 `position: relative`。
6. ✅ **带外部 runtime 的重头**（每个都满足"未完整配置前不联网、正常构建
   不下载任何东西"）：`echarts` `markmap` `swagger` `redoc` `asciinema`
   `plantuml` 全部交付。

   **交付形态分级**（实测体积定的，不是按类别猜的）：`asciinema`（184 KB）、
   `echarts` 按需（530 KB）、`markmap`（733 KB）vendored 进仓库走代码分割；
   `swagger-ui`（1.5 MB）与 `redoc`（1.1 MB）只发钩子与文档，作者自己给 URL
   或自托管 —— 两者是同一份 OpenAPI 的两个渲染器，一个主题带两个 2.6 MB 的
   副本是重复。全部 vendored 会让仓库从 3.3 MB 涨到 ~9 MB。

   **`plantuml` 已交付，零 JS。** 它的渲染器是 Java，没有浏览器实现，图只能
   由服务器画 —— 于是不是运行时问题而是 URL 问题：服务器接受 `~h` 前缀的
   十六进制编码（不压缩），`printf "%x"` 在模板里就能算。图是一个普通
   `<img>`，打印、无 JS、爬虫都一样在。默认关着：不给 `server` 默认值，因为
   默认指向公共服务器等于让每个装了主题的站点把作者的图发给第三方。

   没选默认的 deflate + 自定义字母表 base64，是因为它在 Hugo 模板里没有实现
   路径（没有 deflate 函数，也没有能改字母表的 base64）。代价是 URL 随图变长，
   几十行的图约两千字符，仍在所有浏览器与服务器的限制之内。

   **`echarts` 常用 8 种 + 代码分割**（line/bar/pie/scatter/radar/heatmap/
   tree/graph）。整份 1 MB，按图种切 chunk 后有图的页面只下用到的那几个。
   与 `mermaid` 同一套：产物在 `static/js/echarts/` 而不是 `assets/`，
   因为 chunk 是浏览器按相对路径直取的，Hugo 只发布被 `resources.Get`
   引用过的 asset。

   **`markmap` 不引 `markmap-common` 只为一个类型**：节点树的类型从
   `setData` 的签名上取（`NonNullable<Parameters<Markmap["setData"]>[0]>`），
   要的正是"setData 收什么"，它改了结构编译器照样会说。

   **`embedGlobalCSS` 不能关。** 它不只是配色 —— 节点宽度是靠
   `.markmap-foreign{display:inline-block}` 配上
   `.markmap-foreign>div{width:var(--markmap-max-width)}`（9999px）量出来的。
   关掉后 foreignObject 里的 block 元素塌到最窄，每个节点被量成一个字宽、
   几百像素高，文字竖排，`fit()` 据此算出 `scale(0.16)`。主题要改的配色与
   字体走它的 `--markmap-*` 变量契约，不重抄它的样式表。
   **教训：判断一份第三方样式能不能省掉之前，先把它解出来读，别按名字猜。**

   另一处同因不同表现：`data-td-mindmap-rendered` 必须在 `create()`
   **之前**挂上。CSS 在这个标记出现前让 SVG `display:none`，顺序反了
   `fit()` 量到 0×0，算出 `scale(0)` —— 11 个节点都在 DOM 里，看起来像
   画成了，页面上什么都没有。`autoFit: true` 让每次重画结尾自己取景，
   替掉一个显式 `fit()` 加一个手写 observer（markmap 自带的 observer
   调 `renderData()` 但不调 `fit()`，缩放比例冻在初次那一次）。

   **`mermaid` 已交付，`goat` 顺带交付。** 查 Hugo 内建时发现 `diagrams.Goat`
   是内建的（和 `transform.ToMath` 一样），ASCII 线框图构建时就成 SVG，零运行
   时 —— 它本来不在这份清单上，等于白捡一个图表围栏。`mermaid` 确实没有内建。

   `mermaid` 走代码分割而不是整份进仓库：`esbuild --splitting` 切成入口 1.4 KB
   加 105 个 chunk，`IntersectionObserver` 在图进视口前 400px 才 `import()`。
   有图的页面首屏只多 1.4 KB，图种各自的 chunk 按需下。整份打成单文件是
   3.3 MB，一次性全下。**产物在 `static/js/mermaid/` 而不是 `assets/`** ——
   chunk 是浏览器按相对路径直接取的，而 Hugo 只发布被 `resources.Get` 引用过
   的 asset，放 assets/ 里那 105 个 chunk 一个都进不了 `public/`。代价是入口
   拿不到 fingerprint 与 integrity；chunk 名自带内容哈希，换版本不会命中旧缓存。

   **两处 SVG 尺寸问题，成因不同但表现一样（图被吹大好几倍）：**
   goat 只给了 `viewBox` 没给 `width`/`height`，SVG 没有固有尺寸就撑满容器，
   144 单位宽的图在 755px 正文里放大 5.2 倍，13.33px 的字变成 70px。
   mermaid 那边是自己写的 `max-width: 100% !important` 压掉了它的内联
   `max-width: <固有宽度>px` —— 那条内联样式是刹车不是溢出源，压掉之后固有宽
   248px 的状态机被吹到 755px。**教训：内联样式先判断它在干什么，再决定压不压。**

   **`math`/`chem`/`eq` 已从这一批移出并交付**，它们不带运行时：
   `transform.ToMath` 是 Hugo 内建的 KaTeX。原先排进这里是假定数学一定要装
   浏览器端 KaTeX。**教训：排批次前先查 Hugo 内建了什么。** 这条教训在这一批
   连着生效两次（`math` 与 `goat`），剩下六个仍要逐个查。

   只发 MathML 不发 `htmlAndMathml`，因此不需要 katex.min.css 与 1.5 MB 字体
   （60 个文件）—— 三大引擎都原生渲染 MathML Core，同一条公式 260 字节对
   1184 字节。
7. ✅ 输出变体：`render-table.rss.xml` 已交付。`render-passthrough` 随数学
   一起交付了 —— 它是行内公式的唯一入口，拆开验没有意义。

   **`render-table.print` 不做，它没有可挂的输出格式。** print 目前是纯
   `@media print` CSS（滚动展开、粘连解除、`thead` 跨页重复都在
   `table.css` 里），实测建一个 `render-table.print.html` 产出为零。
   期 6 判过了：**仍然不做，前提没变** —— `baseof.print.html` 最终没建，
   print 依旧不是输出格式，没有东西可以挂 `.print` 变体。

   **RSS 变体不是可选的优化：Hugo 的表格 hook 按输出格式查找，`.html` 那份
   不回落。** 缺这个文件时 Goldmark 用自己的默认渲染，把作者属性原样吐到
   `<table>` 上 —— `{style=...}` 在 HTML 里被策略丢弃并 warn，同一次构建的
   RSS 里活着输出；`{caption=...}` 变成一个无效属性而不是 `<caption>` 元素。
   实测 `render-table.xml`（不带 `rss.`）两个格式都不匹配。
   `render-heading.html` 对 RSS **生效**，所以这不是"hook 一律不进 RSS"，
   而是逐 hook 类型不同 —— 其余 hook 要各自实测，不能外推。
   回归是静默的（构建绿、warn 照出），因此 `scripts/check-outputs.js`
   建真站点读真 `index.xml`；摘掉变体它报 5 条失败。

**验收**：每批建整页快照；Markdown/LLMS 输出不含组件标记；
print 静态展开。

### 期 4 · Landing ✅（22/22，六条视觉缺陷在改，见 `TODO.md`）

22 个 section。单独成期，因为 `_landing.scss` 是最大单块（2,401 行）。

- ✅ 先做 `hero` `cards` `cta` `metrics`（覆盖最常见组合）
- ✅ 再做 `pricing`/`pricing-compare` `faq` `timeline` `steps` `principles`

  逐项 section 的入口校验（形状、非空、未知键）抽成 `landing/items.html`。
  抄到第五份时抽的：代价不是行数而是措辞会漂 —— 同一类错误在几个 section 里
  说法不同，读的人以为是几个不同的问题。抽完六个 section 净减 108 行，
  exampleSite 整站输出逐字节不变。

  `steps` 复用 `<ol class="steps">`（作者标 `{.steps}` 得到的同一份），
  `pricing-compare` 复用 `.td-table-scroll--matrix` —— 溢出自滚、表头与首列
  粘连、`scope`、打印展开都已经在 table.css 里。两处都是零新样式。

  **`.td-prose` 的打印规则管不到 landing。** prose.css 里那条把 `details`
  摊开的规则限定在 `.td-prose` 内，而 landing 的 section 在它之外 —— 少了
  landing 自己那条，打印出来的 FAQ 只有一串问题，答案全部随 details 收起，
  而屏幕上完全看不出来。新增的 section 若带折叠或底色，打印那一份要自己写。

  时间线的 `datetime`：`time.AsTime` 解析不了 `2026-01` 与 `2026`（实测），
  而这两个是合法的 HTML `datetime` 值，也是时间线里最常见的写法 —— 所以先按
  形状认，再回落到 `try (time.AsTime ...)`，都不成就不给属性。

- ✅ 最后 `bar-chart` `logo-wall` `testimonials` `case-study` `code-plate`
  `command-box` `gallery` `contributors` `download` `preview` `markdown`
  `capabilities`

  22 个 section 齐了。四处复用既有实现而不是并行再写一份：`contributors` 与
  `download` 走 shortcode 用的同一套 partial，`gallery` 与围栏共用抽出来的
  `content/gallery-markup.html`，`code-plate` 与 `command-box` 拼真围栏喂给
  `render-block`（于是高亮、复制按钮、文件名标题栏、折叠全部跟着来）。三次
  抽取都逐字节验过整站输出不变 —— 抽取时留在末尾的换行会变成输出字节，
  card 那次已经踩过。

  **`bar-chart` 不走 echarts。** 量过：一个条形图要 333 KB 共享块 + 79 KB
  core + 22 KB bar ≈ 434 KB，而这一节画的是"谁大谁小"。条长用内联
  `--td-bar`，零 JS，JS 关掉时数值仍然是文本。要坐标轴/图例/缩放/tooltip 的
  才用围栏。

  **判数字不能看类型名。** `reflect` 没有 IsFloat/IsInt，而 `printf "%T"` 的
  结果取决于解析器：实测 YAML 里 `42` 是 uint64、`-5` 是 int64、`3.8` 是
  float64。照类型名单判会漏。改成 `try (mul $value 1.0)` 试算 —— 字符串在这里
  失败，而那正是要拒的。

  **`order` 在栅格塌成一栏后照样管用。** `reverse` 起初在 360px 下把图排到了
  文字上面（我自己的注释还写着"塌栏时失效"，是错的）。现在把 `order: -1` 关进
  `@container (min-width: 44rem)`；用容器查询而不是媒体查询，因为塌栏的阈值
  是容器宽度，在侧栏与打印下与视口宽度不一致。

- ✅ `landing.ts`（203 行）—— **不做，22 个 section 没有一个需要它。**

  逐个查过：折叠靠原生 `<details>`，条形图靠 CSS 变量，栅格塌栏靠 auto-fit，
  两栏换序靠 `@container` + `order`，等高卡片里的按钮贴底靠 `margin-block-start:
  auto`。整个 landing 目录只出现三个 `data-td-*`：`data-td-align` 与
  `data-td-status` 是 CSS 选择器的钩子，`data-td-scroll-label` 喂给已经在跑的
  `scroll-region.ts`（实测：360px 下 pricing-compare 的表拿到 `tabindex="0"`、
  `role="region"` 与 i18n 来的可访问名）。

  真需要 JS 的场合已经各自有运行时（代码块的复制按钮、图表围栏），landing 的
  section 复用它们而不是自己带一份。凭空写一个入口等于留一段没人加载的代码。

**验收**：每个 section 一个 Playwright 视觉用例 + 响应式断点确认。
narrative 字段渲染 Markdown、label 字段纯文本，这个区分要保住。

### 期 5 · 交互与外围 ✅

原计划搬 1198 行面板 + 735 行键盘导航，实际写了 `palette.ts` 200 +
`palette-match.ts` 50 + `reading-keys.ts` 130 + `reading-keys-model.ts` 80。
差额不是省略，是这些行在这个主题里没有对应的问题：

- **面板不列页面**，只列动作（8 条）。参照实现一半是页面搜索：自建 lunr 索引、
  自算分。这里的搜索是 pagefind，已经有分节锚点、CJK 分词与增量索引 ——
  面板再实现一遍是一个更差的结果列表加一份多下载的索引。于是 `action-registry`
  与 `page-actions` 整个不需要：动作全是主题内建的，站点配不进来，那两层是为
  「站点能注册自定义命令」准备的。
- **键盘只留 `j`/`k`**。参照绑了十一个裸键（wasd/qe/h/ly/t/r/fc）。裸键抢的是
  整个字母表，而侧栏本来可 Tab 可方向键、翻页是链接、主题与面板各有按钮 ——
  它们不缺一个裸键。`j`/`k` 留下是因为没有替代：滚轮不认识「节」。
- **滚动引擎删光**。实测 `scrollIntoView({block:"start"})` 已经把 scroll-padding
  与目标的 scroll-margin 都算进去（标题落在 66px；给它加 40px scroll-margin
  之后落在 106px），所以 `cssPixels`/`anchorOffset`/`scrollPaddingOffset` 三个
  函数算的是浏览器白送的东西。存取 `scroll-behavior` 那套也不需要 ——
  那是为了躲 Bootstrap 的全局 `smooth`，这里没有。
- 留下来的两处都带实测数字：连按游标（站点加一行 `scroll-behavior: smooth`
  就会让滚动变异步，那时 rect 是旧值，按住 `j` 会跳一节卡住）与越线余量
  （落点实测 66.0625 对阅读线 66，严格比较会让 `j` 跳到同一节两次）。
- `surface-coordinator.ts` / `asset-list.ts` / `authored-a11y.ts` 判定不做，
  理由见期 4 末尾同一段：它们协调的是这里不存在的多入口竞争。

搜索：pagefind，四个外壳全部标 `data-pagefind-body`，权重五档（实测 0–10
整个区间只换来 2.4× 的分差，不是线性乘子），UI 用 JS API 而非默认组件。
外围：`share`（15 平台）`feedback` `giscus` `dark-mode` `clipboard` 已完成。

**验收结果**：面板全键盘可用（`Ctrl+K` 开、输入筛选、方向键移动且
`aria-activedescendant` 跟随、两端不环绕、Escape 关闭并还原焦点到打开前那个
链接）；键盘覆盖实测六个面 —— 106 个控件全部可聚焦且有可访问名（唯一例外是
`main[tabindex="-1"]`，跳转链接的落点，本就不该进 Tab 序列）、跳转链接聚焦
时可见、搜索一次 Escape 关闭且查询文本不被吞、抽屉开时 `inert` 上身关时还原、
tablist 漫游 tabindex 与 Home/End 正确、RTL 下方向键镜像正确；缺索引时搜索
退化成一条播报而不是坏掉的对话框。

### 期 6 · 输出格式与收尾 ✅

- print 输出（`baseof.print.html` + `print:` variant 全量核对）—— 做完了，
  **没有建 `baseof.print.html`**。逐项量过之后那个模板买不到东西：chrome 已经
  全部 `display:none`（navbar/侧栏/TOC/footer/pager 实测都是），折叠块已经摊开，
  `break-inside: avoid` 在 10 个文件里。缺的只是 `@page`（纸张、页边距、页码）
  与 `orphans`/`widows`，都是纯 CSS，已加进 `base.css`。**一个独立 baseof 是
  整体替换而非继承**（`baseof.html:12` 记着这条），为一份 `@page` 复制整个外壳
  换来的是每次外壳改动要改两处。
  顺带修掉一个真缺陷：matrix 表的粘连 `white-space: nowrap` 在纸上没被撤掉，
  A4 内容宽 673px 下表格撑到 769px，右边一列印不出来。撤掉后 626px。
  **全站 38 页在纸宽下逐页量过**：零溢出、零空白节。
- LLMS / Markdown / RSS —— `layouts/all.md` 与 `layouts/index.llms.txt`。
  一个新 partial `content/plain.html` 是唯一的格式判据，30 个 shortcode 与
  hook 都问它。**格式身份只能走 Page Store**：`.Page.OutputFormat` 不存在
  （实测 `can't evaluate field OutputFormat in type page.Page`），而 shortcode
  在每种输出格式下各求值一次（实测同页两个探针，一个 `UNSET` 一个 `markdown`），
  所以 `all.md` 取完正文要把标志复位 —— Store 是页级的，Hugo 不保证格式的渲染
  顺序。
  正文用 `.RenderShortcodes`：`.Content` 出的是 HTML，`.RawContent` 里 shortcode
  没展开。**先渲成 HTML 再剥标签是错的**：`**bold**` 会变成 `bold`，实体活过
  剥标签，围栏代码变成一团 Chroma span。实测结果是泄漏的组件标记从 148/135/91/74/36
  （前五页）降到 **0** —— 剩下的每个标签都与源文件里的计数一一对上。
- **BookManifest 不做。** 它要为整本书出一份机器可读清单（页序、层级、图表
  索引），而清单里的每一项都要先渲染那一页才知道 —— 也就是把全站 HTML 渲一遍，
  只为收 Store 里的副作用，然后把 HTML 丢掉。这个代价只有在下游真有一个打包器
  （出 EPUB/PDF）时才回本，而这个主题不带打包器，也没有消费方要求过。
  `llms.txt` 已经覆盖了「给机器一份全站结构」这个需求，且它只读元数据，代价
  基本为零。**等有人真的要打包再做**，届时清单的字段该由那个打包器的输入定义，
  现在猜出来的 schema 大概率是错的。
- 32 locales 全量导入 + schema 对齐检查
- ✅ VENDOR.json + license/version/checksum。提前做了，因为**仓库里一个
  LICENSE 文件都没有** —— 主题自己声明 Apache-2.0（`theme.toml` 与
  `package.json`）却不带副本，而 `static/js/` 下 148 个提交的 bundle 文件是
  再分发，MIT 与 Apache-2.0 都要求许可文本与版权声明随之附带。

  包名不从 `package.json` 抄，问 esbuild 的 metafile —— 它记的是每个 bundle
  的真实输入文件，那才是"哪些第三方代码在产物里"的地面事实。
  `pnpm-lock.yaml` 记的是构建用过的整棵树（含 eslint、vitest），不是被分发的
  那一部分。实测：产物里是 **65 个包**，而直接依赖只有 4 个。

  `scripts/gen-vendor.js` 出两份：`VENDOR.json`（机器读）与 `NOTICES.md`
  （许可正文 + 上游 NOTICE，2270 行）。`--check` 进门禁。
  手抄的那份 CSS 记的是**上游文件**的校验和，不是仓库里那份的 —— 仓库里那份
  顶上加了说明头，字节不同；上游校验和回答"抄的是不是那个版本的那些字节"，
  本地被改动这件事 git 已经在管。脚本另外验证本地副本正文与上游一致，
  捕的是"升级了包但忘了重抄"。

  两处手查不如脚本：`khroma` 不写 `license` 字段只放文件（回落读文件正文
  认 SPDX，认不出就写 `see <file>`，不猜）；`es-toolkit` 是 MIT 却带
  NOTICE —— 我按许可类型筛着手查时漏了它。
- 无效配置的 warn + fallback 全量核对（禁止 `errorf`）—— `check-fallbacks.js`
  要求每条 `warnf` 的字面量消息里出现一个处置短语，并禁掉 `errorf`。
  为什么是这一半：`check-warnings.js` 的 24 个夹具证明「特定非法输入确实出声」，
  而「出声之后说清楚接下来做什么」没人盯 —— 少这半句不会让构建失败，只会让作者
  盯着一条正确的警告不知道改哪里。处置短语表是从现有 316 条消息里已经写出来的
  动词收上来的，不是先定表再改消息（首跑 34 条假失败，错的是表不是消息）。
  实测 315 条字面量消息全部指名回落，0 处 `errorf`。
- 文档：`README` + 定制入口说明（**明写 `@theme` 替代 Sass 覆盖**）—— README
  加了定制 / 输出格式 / 界面文案三节与六个检查器的表。
  自己那份草稿里编过五个不存在的 token 名（`--color-td-accent`、
  `--font-td-display`、`--spacing-*`、`@theme static` 的用法、"29 个 shortcode"
  而实际 30 个），逐个对着源码查掉了 —— 文档里的名字必须能被 grep 到。

**验收结果**：`--panicOnWarning` 在四种输出格式全开下通过；四态输出
（HTML/print/markdown/RSS）齐，markdown 侧零组件标记泄漏；32 份 locale schema
一致（97 键，620 条真译文 + 2387 条带 `TODO(i18n)` 标记的英文兜底）。
另补了 `.github/workflows/ci.yml` —— 九个检查器在这之前只在一台机器上跑过，
而产物提交进仓库意味着「源码改了但产物没重建」是能推上来的，`dist` job 重建后
要求 `git diff --quiet -- assets/dist`。兼容下限 0.160.1 曾与开发版 0.165.0 并列
在矩阵里（声明一个没人验过的下限等于没声明），后来挪进手动触发的
`floor.yml`：两版跑同一套检查器，下限专有的失败一次没出现过，而它让每次推送
多等一整轮。下限仍然验，只是发版前跑而不在关键路径上。

## 工作量重估（2026-08-31，基于实测）

按代码行数估工作量不成立（写代码本身都是几分钟，时间花在踩静默失败上）。
这里换成按批外推。

实测吞吐（`git log --shortstat`）：

| 阶段 | 产出 | 提交 | 挂钟 |
|---|---|---|---|
| 期 1 地基 | 5,976 行 | 1 | — |
| 期 2 外壳 | 1,745 行 | 6 | ~2.5h |
| 期 3 组件（7 批） | 3,965 行 | 7 | ~5.5h |

**单位是"批"，约 45 分钟**：一个组件的模板 + CSS + 可选 runtime + 单测 +
非法输入夹具 + 浏览器验证 + 提交。

**下面这张表是历史记录，不是待办 —— 期 3 到期 6 都已交付。**留着是因为它下面
那几段讲的是「计数纠正与范围变动怎么区分」，那个方法还用得上。

| 阶段 | 批数 | 估时 | 实际 |
|---|---|---|---|
| 期 3 余下（6 个运行时 + 2 个输出变体） | ~8 | 7–8h | ✅ |
| 期 4 Landing | ~8 | 6h | ✅ 22/22 section |
| 期 5 搜索 / 面板 / 分享 | ~6 | 5h | ✅ |
| 期 6 输出 / 32 语言 / 审计 | ~7 | 5h | ✅ 四提交 |
| **合计** | **~29** | **23–24h** | |

期 3 那一行改过两次。第一次 ~14 → ~17：交叉引用体系原按 1 批预算，设计过后
至少 3 批（登记器 + 四个目标 + `xref` + 五个列表），`field`/`fields` 另占 1 批。
第二次 ~17 → ~10：那 17 批里已经交付了 7 批，而 `math`/`chem`/`eq` 三个从"带
外部运行时"降级成静态围栏，一批就够。第三次 ~10 → ~8：`mermaid` 原按 2–3 批
留着（chunk 切分 + 语言/配置身份 + 深浅色主题切换），实际一批做完 —— 代码分割
是 esbuild 的一个开关，语言/配置身份对它不适用（chunk 里没有本地化字符串），
主题切换是一个 MutationObserver。`goat` 是内建的，不占批。
**三次都不是范围变动，是计数纠正。**

**这个数字偏乐观的地方**：shortcode 不同质，"标记类一批吃好几个"这个假设只在
三个上成立。实测：`badge`+`kbd` 一批（各 30–50 行 + 一个 CSS 文件），`param`
半批。而原先同列在标记类里的 `eq`/`fig`/`tbl`/`eg`/`xref` 是一整套交叉引用体系
（登记器 + 三张 Store 表 + 四件共享校验设施），`field`/`fields` 各 92 行另带
五个 partial —— 这六个合起来至少 3 批，不是"一批吃掉好几个"。

剩下 5 个带外部 runtime 的（`echarts` `markmap` `swagger` `redoc`
`asciinema`）要处理离线约束、版本锁、VENDOR.json 条目 —— 但只有前三个需要，
`swagger`/`redoc` 不入库就没有版本可锁。`mermaid` 那批走通之后代码分割是现成的。

**偏保守的地方**：32 个 locale 是机械活，靠 sync 工具铺英文兜底，占不满一批。
另外「先查有没有更省的路」这条已经生效三次：`math` 与 `goat` 是 Hugo 内建，
`plantuml` 不需要任何运行时。别按"这类功能一般要装个库"预判。
这一条后来验证了：locale 那一步确实机械（脚本铺 2387 条兜底），但**它咬了一次**
—— sync 工具首跑把 31 份文件全写坏了：`contributors_count` 是 CLDR 复数映射，
而工具当成纯字符串搬。机械活的风险不在量上，在形状假设上，所以工具里加了形状
守卫而不是靠人眼复查 31 份。

结论：**23–24h，重量在期 3 的尾巴上，不在数量上。** 事后看这个判断成立。

## 依赖关系

```
期0 ──> 期1 ──> 期2 ──┬──> 期3 ──> 期4
                      └──> 期5
                              └──> 期6
```

期 3 与期 5 可并行（内容原语 vs 交互），期 4 依赖期 3 的 card/steps 等
基础原语。

## 搜索选型

2026-08-25 取证后定 **pagefind**。用户明确接受后置构建步骤。

| | lunr 2.3.9 | MiniSearch 7.2.0 | **pagefind** |
|---|---|---|---|
| 维护 | 2020 年后停更 | 2025-09 | 活跃 |
| 1000 页索引载荷 | 整份 ~1.4 MB gzip | 整份 ~1.4 MB gzip | **分块 ~100 KB** |
| 消费方构建 | 只需 `hugo` | 只需 `hugo` | **加 `npx pagefind`** |
| `hugo server` 下可用 | 是 | 是 | **否** |
| CJK | 手写子串匹配 | `Intl.Segmenter` | 原生分词 |
| 字段权重 | 有 | 有 | 有（`metaWeights`） |
| 标题层级加权 | 单一 headings 权重 | 同 | **h1..h6 自动 7→2** |
| 分面 | 手写 | 手写 | **`data-pagefind-filter`** |
| 每文档 boost | 线性乘数 | `boostDocument` | 元素权重，二次标度 |

**决定性的一维是索引架构，不是代码量。** lunr / MiniSearch 那类把每页正文全文
塞进单个 JSON，浏览器首次搜索前必须整份下载。按实测 4.5 KB/页推算：

| 站点规模 | lunr / MiniSearch | pagefind |
|---|---|---|
| 200 页 | ~880 KB 未压缩 | ~100 KB |
| 1000 页 | ~4.4 MB 未压缩（~1.4 MB gzip） | ~100 KB |
| 5000 页 | ~22 MB 未压缩 | <300 KB |

pagefind 分块索引，每次搜索只取需要的块。差一个量级，调优补不上。

整索引架构下常见的补救是给站点作者一个"索引范围"参数（只索引标题 / 加小标题 /
加摘要 / 全文四档），让他手动降级索引来换带宽。那是架构缺陷的逃生舱，**分块
索引下这个参数不需要存在** —— 少一个参数，也少一处"搜不到东西是因为当初调低了
这一档"的排查。

> pagefind 不丢 boost 排序：`metaWeights` 与 `data-pagefind-weight` 都支持权重。

**lunr 出局**：2.3.9 发布于 2020，此后只动过 npm 元数据，实际停更。

**MiniSearch 出局**：架构与 lunr 同级（整索引下载）。它在同架构内是最优
选择（活跃维护、BM25、`boostDocument` 原生），但没解决带宽问题。

### 接受的两个代价

1. **消费方多一步构建。** 见下方契约。
2. **每文档 boost 是二次标度，不是线性。** 作者写 `search_boost: 2` 直觉上是
   "重要程度翻倍"，而 pagefind 只有元素级 `data-pagefind-weight`，2.0 ≈ 4×
   影响，上限 10.0。权重要挂到内容包裹元素上，**并且这个映射要标定过再定档**，
   不能把作者写的数字直接透传。期 5 专门验一轮排序结果。

### 消费方契约（必须写进用户文档）

```sh
hugo                          # 先出站
npx pagefind --site public    # 再建索引，每次部署都要
```

`hugo server` 下搜索不工作，本地预览搜索需另开 `pagefind --site public --serve`。
消费方需要 Node 环境 —— 这是本项目唯一要求消费方装 Node 的地方，其余产物
（CSS/JS）都已编译提交。

### 排序契约（期 5 的目标）

字段权重：title 5、keywords 4、categories 3、tags 3、headings 3、
description 2、body 1。外加每文档 `search_boost`：解析 cascade 继承，只接受
正有限数值，无效值 warn 并回退 1.0。

pagefind 侧的映射：字段权重走 `metaWeights`，标题层级由 pagefind 自动按
h1..h6 递减处理（不必自己给 headings 定一个统一权重），每文档 boost 走包裹
元素的 `data-pagefind-weight` 并按上面第 2 条重新标定。`search_exclude` 走
`data-pagefind-ignore`。

## 不做的事

- 不做 Hugo Module 分发（这是分发方式的前提，不是遗漏）
- 不做从其他主题迁移的自动工具（clone-and-own 场景下没有消费方需要迁移）
- 不做 pagefind 换栈（期 6 之后单独评估）
- 不做 CSS 框架兼容层
- 不做 SCSS 与 Tailwind 并存

## 已定事项

1. **仓库 `hugo-theme-atlas`，版本从 `0.1.0` 起。**
2. **搜索用 pagefind**，接受消费方的后置构建步骤。取证与三方对比见
   §搜索选型。这是一项**消费方契约**，必须写进用户文档。
3. **另起文档站，等主题开发完再做。** 期 6 之后的待办，不占当前分期。
4. **clone-and-own 分发。** Tailwind 靠扫描模板决定产出哪些类，消费方自己的
   模板扫不到 —— 做成 Hugo Module 的话，消费方新增的模板用什么类都不会生效。
