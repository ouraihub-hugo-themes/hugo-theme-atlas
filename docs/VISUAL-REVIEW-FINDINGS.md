# Landing 视觉复核 —— 执行结果

对 `docs/VISUAL-REVIEW.md` 的回报。执行于 2026-09-02，Chromium 151.0.7922.34，
1280×900 与 360×800 两个视口，亮色 / 暗色 / 打印三种媒体，共 55 张截图。

截图在 `<截图目录>\`（仓库外，无需清理）。

**本文档是纯文字结论，读它不需要看任何图。** 所有视觉判断都已经写成可执行的
描述（位置、颜色、形状、数值），图只是我得出结论的原始依据。

---

## 摘要

**一个阻塞级缺陷压过了任务书里的全部七处怀疑：全站 40 个 sprite 图标一个都没
渲染出来。** 它同时是好几节"看起来不对"的根因，也使第 3 条怀疑（partial 档图标
的语义）暂时无法回答。

其余六处怀疑里，两处不过（相邻同色节的分界、logo 墙的灰度与定位），三处过
（3.2% 的条、timeline 收尾、暗色下的 featured 边框与窗口圆点），一处这次的
fixture 覆盖不到（plain 档下的卡片边界）。

---

## 一、阻塞：sprite 图标全站未渲染

### 现象

页面上看不到任何图标。受影响的至少有：

| 位置 | 本该显示 |
| --- | --- |
| 导航栏 | 书本 logo |
| `#hero-0` | 按钮内的 `book` |
| `#cards-2` | `rocket` / `gear` / `book` |
| `#principles-4` | `book` / `lock` / `scale-balanced` |
| `#pricing-7` | 9 个套餐 `check` |
| `#pricing-compare-8` | `check` / `close`（整两行空白） |
| `#code-plate-9`、`#command-box-10` | 复制按钮 `copy` |
| `#download-14` | `box` / `file-zipper` / `code-branch` |
| `#capabilities-17` | `check` / `angle-down` / `close` |

### 为什么量化检查没抓到

这是这个 bug 最值得注意的地方 —— **所有可断言的指标都是正常的**：

- `/dist/icons.svg` 返回 **200**，25633 字节
- sprite 里 `id="check"`、`id="angle-down"` 都在，且各自带正确的 `viewBox`
  （如 `<symbol id="check" viewBox="0 0 448 512">`）
- 页面无任何失败请求（监听 `response` >= 400 与 `requestfailed`，结果为 none）
- 外层 `<svg>` 有 16×16 的 `getBoundingClientRect()`
- `fill` 计算值正确（`rgb(36,95,148)` / `rgb(61,78,97)`，随 `data-td-status` 变化）
- DOM 结构完全符合预期

唯一露馅的指标是 **`<use>` 元素的 `getBBox().width` 全部为 0**。

### 定位过程

对全页 40 个 `svg.td-icon` 逐个测 `use.getBBox()`，**无一例外全是 0 宽**，
说明不是 capabilities 或某个 symbol 的问题，是引用机制本身。

然后做了一次对照实验 —— 把 sprite 文本 fetch 下来内联进 DOM，再把一个图标的
`href` 从 `/dist/icons.svg#check` 改成 `#check`：

```js
const txt = await (await fetch('/dist/icons.svg')).text();
const holder = document.createElement('div');
holder.innerHTML = txt;
document.body.insertBefore(holder, document.body.firstChild);

const u = document.querySelector('#capabilities-17 svg.td-icon use');
u.setAttribute('href', '#check');
// 等两帧后
u.getBBox();   // { w: 14, h: 13 }   ← 从 0×0 变成有几何
```

`bbox` 由 `0×0` 变为 `14×13`。

视觉上同步确认：对 `#capabilities-17` 第一个 `<li>`（内容为「四种阅读外壳」）
截了改动前后两张图。

- **改动前**：整行只有「四种阅读外壳」四个字，文字左侧是空白，没有任何图形。
- **改动后**：同一行文字左侧出现一个深蓝色的勾（✓），字号与文字相当。

两张图除这个勾之外完全一致 —— 文字位置、缩进、行高都没变，所以变化只来自
图标本身开始绘制。

### 结论

**跨文件 `<use href="/dist/icons.svg#id">` 没有解析。** symbol 定义本身没问题，
换成同文档内的 `#id` 立刻就好。

未继续深挖根因。怀疑方向：`layouts/baseof.html` 中 sprite 的引入方式
（该文件在本次执行时处于已修改未提交状态），或 sprite 根元素上的
`style="display:none"` 与外部引用的交互。**根因排查留给下一步。**

### 连带影响（都不是独立问题）

- `#pricing-compare-8`「私有仓库」「合规审计」两整行空白
- `#command-box-10` 代码块顶部约 40px 的无意义空白灰条
- `#capabilities-17` 四项之间只剩空格分隔，读起来是散的

---

## 二、七处怀疑逐条结论

### 1. plain 档下的卡片边界 —— 本次无法判断

`#testimonials-19`（muted）的卡片浮起清楚，边界一眼可辨。

但**任务书真正要问的情形在这 22 节里不存在** —— 没有任何一节是卡片类落在
plain 档。`.td-landing-plan` 在 `#pricing-7`（muted），`.td-landing-quote` 在
`#testimonials-19`（muted）。要判断"1px 边框在同色底上够不够"，需要专门造一节
plain 档的卡片来看。

### 2. 条形图里 3.2% 那根条 —— 过

**能读作"一根很短的条"，不会读成"没渲染"。**

具体看到的：那 15px 是一个填满轨道高度的、两端圆角的深蓝色胶囊，颜色与上方
42 KB（约 210px）和下方 118 KB（约 580px）那两根完全一致。三根条左端对齐在同一
垂直线上，所以它读起来是「同一组里最短的那根」，而不是「空的」。右侧
`3.8 KB` 的数值标签也在，进一步排除了误读。

不需要加最小宽度。

### 3. capabilities 的 partial 档图标 —— 无法回答

图标没渲染出来（见第一节），`angle-down` 到底像不像"部分支持"，这次看不到。

**修好图标后需要重新判断这一条。**

### 4. logo 墙的灰度 + 半透明 —— 不过（两个问题）

- **灰度压得过重。** 0.7 的透明度本身不算太淡，但配合 `grayscale(1)` 之后，
  三个图呈现为从上到下的灰→深灰渐变色块，看不出任何轮廓或图形内容，就是三个
  素色矩形。不是"淡到看不清"，是"暗到读不出东西"。
- **三个 logo 整体偏右。** 具体位置：节宽 1568px（含 2× 缩放），三个图块大约从
  x=620 排到 x=945，即集中在页面右中部；而同一节的标题「构建工具」在 x=96。
  logo 组既没与标题左对齐，也没在节内真正居中，左侧空出一大片。这与 fixture
  用同一张图无关，是布局问题。

悬停恢复彩色的过渡：静态截图无法验证，**未测**。

### 5. 相邻同色节的分界 —— 不过

**8rem 的间距不够。** 以 `#hero-0` → `#metrics-1` 为例：两节背景色完全相同（亮色下
都是 `rgb(241,244,248)`），中间无分界线、无阴影、无宽度变化，唯一的分隔信号就是
一段空白。而节内部的元素间距（例如 hero 按钮组到下方图片）与这段节间空白在量级上
接近，所以读下来像是同一节里的下一段，而不是新的一节。

缓解因素：节标题字号足够大且是粗体（`一些数字` 目测 40px 以上，与正文层级差明显），
所以不至于让人迷路 —— 能看出「这里开始讲新东西」，但看不出「这是一个新的 section」。

### 6. timeline 的竖线收尾 —— 过（本次最干净的一节）

- 线**正好收在第三个圆点上方**，没有多出的尾巴。第三条（「模糊时间」）圆点下方
  完全无线。
- 第二段与第三个圆点之间**没有断缝**，线段直接接到圆点边缘。
- 三种圆点**一眼能分**，且区分靠的是形状而不只是深浅：
  - done（`2026-01-15`）—— 实心深蓝圆点
  - current（`2026-06`）—— 白心 + 蓝色描边的空心圈
  - planned（`2027`）—— 淡灰实心圆点，明显比前两个淡

### 7. 暗色模式

- **`#cta-21` 的 accent 档 —— 偏亮。** 整节背景是一块饱和度较高的中蓝（目测接近
  `#8ab4d8` 那个亮度档），占整个节宽，在周围几乎全黑的页面里亮度跳得很多。
  标题「收尾那一块」与正文都是近黑色，字本身读起来殫无因难；问题不在对比度，
  而在从上一节（深色 `#logo-wall-20`）滚下来时的亮度突变。
- **`#pricing-7` featured 粗边框 —— 过。** 中间那张卡（「团队版 ¥299」）四周是一道
  浅蓝边框，在近黑卡面和深色节底上很清楚；旁边两张卡（「社区版」「企业版」）
  的边框是暗灰色，两者差异明显，一眼能看出中间那张被突出。比亮色模式下还明显。
  另外「最常选」徐章是浅蓝底 + 深色字，也清楚。
- **`#preview-15` 窗口外框三个圆点 —— 过，没有消失。** 在窗口标题栏左上角
  能看到三个横排的灰色小圆点，亮度比标题栏底色高一档，不抢眼但确实存在。

---

## 三、逐节问题

只列看起来不对的。未列出的节在两个视口下均未见异常。

### 1280×900

| 节 | 问题 |
| --- | --- |
| `#metrics-1` | 四项基线不齐。四个大数字（29 / 22 / 32 / 0.1.0）顶部对齐，但只有第二项在标签「landing section」下多了一行副标题「这一批四个」，把那一列撑高约一行，四列下沿因此参差。 |
| `#capabilities-17` | 四项排成 3 列 + 第四项独占第二行，第二行右侧空两个格位。且三列宽度不等（按内容自然宽度排），第一项 x≈130、第二项 x≈600、第三项 x≈1060，间距很大。叠加图标缺失后，四项之间只靠空白分隔，读起来是散的。 |
| `#logo-wall-20` | 三个 logo 集中在 x≈620～945，而节标题在 x=96；既未左对齐也未真居中，左侧空出约半个节宽。 |
| `#command-box-10` | 代码块顶部有一条约 40px 高、横贯整个块宽的浅灰色空白带（复制按钮所在），带内无任何可见内容，与下方代码区有一条分界线。图标问题的连带。 |
| `#pricing-compare-8` | 「私有仓库」「合规审计」两行的三个数据列全空（只有行背景色），而同表「shortcode 数量」行的 29 和「响应时间」行的文字都正常显示 —— 差别就在前两行靠图标表达。图标问题的连带。 |

### 360×800

未发现新的挤压、溢出或重叠。hero、pricing、capabilities 竖排后均正常，
`#metrics-1` 的基线问题在竖排下自然消失。

---

## 四、未覆盖 / 存疑

- **打印媒体**：`shots/print-full.png` 已生成，但整页过长，**未逐节细看**。
  任务书里"整页打印是否可读、有没有哪节变成空白或一团糊"这个问题**没有回答**。
- **悬停过渡**：logo 墙恢复彩色的过渡效果，静态截图无法验证。
- **plain 档卡片**：见怀疑 1，需要专门造 fixture。
- **图标 bug 的根因**：只定位到"跨文件 use 不解析"，未找到为什么。

---

## 五、一个假象，不用查

**360 宽度下 `#pricing-7` 的截图里，导航栏压住了第一张卡的价格。**

这是逐节截图方法的产物 —— `scrollIntoViewIfNeeded()` 把元素滚到了 sticky
header 下面。`.td-navbar` 是 `position: sticky`、高 50px、`z-index: 100`，
正常滚动浏览不会出现这个遮挡。

（顺带：`#pricing-7` 的 `scroll-margin-top` 是 `0px`。锚点跳转会不会被 header
遮住是另一个问题，本次未验证。）

---

## 六、复现方法

### 环境

```powershell
cd <主题仓库>
pnpm css:build; pnpm ts:build
hugo server --source exampleSite --themesDir ../.. --port 1319 --renderToMemory
```

### 两个坑

**1. 用 `127.0.0.1` 而不是 `localhost`。**
hugo 只绑 IPv4（`Get-NetTCPConnection -LocalPort 1319` 显示 `LocalAddress`
为 `127.0.0.1`）。`localhost` 在本机解析到 IPv6 `::1`，请求直接失败。
任务书里写的 `http://localhost:1319/landing/` **连不上**，
要用 `http://127.0.0.1:1319/landing/`。

**2. hugo 参数别经 `pwsh -Command` 传。**
`--themesDir ../..` 会被吞掉，hugo 打印一整屏帮助文本，真正的错误在最后一行。
写进 `.ps1` 脚本文件用 `-File` 执行，或直接调 exe。

### 浏览器

按任务书的 B 方案，不装任何包：

```js
process.env.PLAYWRIGHT_BROWSERS_PATH = '<浏览器缓存目录>';
const { chromium } = require(
  '<.../node_modules/playwright-core>'
);
const browser = await chromium.launch({
  executablePath:
    '<那个目录里的 chrome.exe>',
});
```

### 验证图标 bug 是否已修

```js
await page.evaluate(() =>
  [...document.querySelectorAll('svg.td-icon use')]
    .map((u) => u.getBBox().width)
    .filter((w) => w === 0).length
);
// 修好前：40   修好后应为：0
```

---

## 七、残留确认

- 截图全部落在 `<截图目录>\`（55 张，仓库外）。
- `参照仓库`：`tests/site/resources` 为 `False`；`git status --porcelain` 仅有
  `?? .playwright-mcp/` —— **该目录在本次执行开始前就已存在**，非本次产生。
- `hugo-theme-dev`：执行期间误建的 `nul` 与一个空目录已删除。
  剩余 5 个 `M`（`docs/VISUAL-REVIEW.md`、`layouts/_partials/shell/breadcrumb.html`、
  `layouts/_partials/shell/pager.html`、`layouts/baseof.html`、
  `scripts/check-outputs.js`）为执行前既有的改动，未触碰。
- hugo server 已停止。
