# Landing 视觉复核任务书（第一轮，已执行）

> **状态：已执行**，结果在 `VISUAL-REVIEW-FINDINGS.md`。第二轮的窄范围任务书是
> `VISUAL-REVIEW-ROUND2.md`（**未执行**）。这份留着是因为第 37–42 行的工具约束
> 与第 74–85 行的参照树清理要求对每一轮都成立。

给一个能看图的模型/人执行。我把 22 个 section 全做完了，但只做了**可断言的量化
检查**（栅格列数、是否溢出、计算出来的颜色值、`order` 值、`tabindex` 是否挂上、
`datetime` 属性、DOM 顺序、无障碍属性）。这些证明了"结构和样式按预期生效"，
证明不了"看上去对不对"——间距是否失衡、元素是否挤在一起、留白是否合理、对比度
在真实渲染下够不够、某个图标是否传达了它该传达的意思。

**这份任务书要的就是后者。** 请只回答看得见的东西，量化的部分我已经验过。

## 环境

```sh
cd <主题仓库>
pnpm css:build && pnpm ts:build
hugo server --source exampleSite --themesDir ../.. --port 1319 --renderToMemory
```

页面：`http://localhost:1319/landing/`

### 浏览器：什么都不用装

**`%LOCALAPPDATA%\ms-playwright` 是空的，这不是缺东西。** User 级环境变量
`PLAYWRIGHT_BROWSERS_PATH` 把它重定向到了下面这个目录（那边残留的 `b` 目录是设
变量之前的，忽略）：

```
<浏览器缓存目录>\
  chromium-1234\chrome-win64\chrome.exe   151.0.7922.34   ← 用这个
  chromium-1223 / 1228 / 1187                             （更早几份）
  chromium_headless_shell-1223 / 1228 / 1234
  webkit-2191 / 2287, ffmpeg-1011, winldd-1007
```

npm 包在 `<playwright mcp 包>`。

**不要在 `参照仓库` 里跑 `npx playwright install`。** 那个目录没有 `package.json`
也没有 playwright 依赖，npx 找不到包，只会吐一段「先装依赖」的横幅就退出 ——
看起来像下载失败，实际是它根本没开始下，而且本来就不需要下。

**也不要 `pnpm add -D playwright` 装进 `hugo-theme-dev`。** 这个主题是
clone-and-own 分发的，消费方不该为了看图装一个 playwright。

两条路，挑一条：

**A. 你也有 Playwright MCP** —— 直接用，浏览器已就位。

**B. 只有普通 shell** —— 用现成的二进制，不装包：

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "<浏览器缓存目录>"
$pw = "<.../node_modules/playwright-core>"
node -e @"
const {chromium} = require('$pw');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.goto('http://localhost:1319/landing/', { waitUntil: 'networkidle' });
  await p.screenshot({ path: '<截图目录>/landing-1280.png', fullPage: true });
  await b.close();
})();
"@
```

系统 Chrome/Edge 也能驱动（`channel: 'msedge'`），但没必要 —— bundled chromium
已经在那儿了。

### 截图落哪

放 `<截图目录>\`。**不在任何仓库里**，所以不用清理。

走 MCP 的话它的 cwd 可能锁在 `<参照工作树>`，截图会掉在那里。**那个
仓库是只读参照，一个字节都不能留下。** 跑完逐条确认：

```sh
git -C <参照工作树> status --porcelain      # 必须是空的
```

```powershell
Test-Path <参照工作树>/resources  # 必须是 False
```

第二条单独查是因为 `resources/` 在 参照仓库 的 `.gitignore` 里 —— 写进去了
`git status` 照样是干净的，那次写入不会被第一条发现。

### 量之前先等它稳定

带过渡的属性读到的可能是中间值。我在这上面栽过四次，每次都像是能用的代码出了
bug：FAQ 箭头读到 `-45deg`（150ms 过渡飞行中，稳定值是 `45deg`）、打印按钮底色
读到 `rgba(36,95,148,0.97)`（那个小数 alpha 就是过渡没结束的信号，稳定后是
`rgba(0,0,0,0)`）、滚动区域的 `tabindex` 像是没挂上（`ResizeObserver` 还没触发）。

改视口之后、或者刚触发交互之后，等一下再读。`ResizeObserver` 驱动的东西，直接
按目标宽度开页比先开后 resize 可靠。

## 22 节的顺序与配色档

| # | 锚点 | 档 |
| --- | --- | --- |
| 1 | `#hero-0` | plain |
| 2 | `#metrics-1` | plain |
| 3 | `#cards-2` | muted |
| 4 | `#steps-3` | plain |
| 5 | `#principles-4` | muted |
| 6 | `#timeline-5` | plain |
| 7 | `#faq-6` | plain |
| 8 | `#pricing-7` | muted（第二张卡 featured） |
| 9 | `#pricing-compare-8` | plain |
| 10 | `#code-plate-9` | plain |
| 11 | `#command-box-10` | muted |
| 12 | `#gallery-11` | plain |
| 13 | `#markdown-12` | plain |
| 14 | `#contributors-13` | muted |
| 15 | `#download-14` | plain |
| 16 | `#preview-15` | muted（带窗口外框） |
| 17 | `#bar-chart-16` | plain |
| 18 | `#capabilities-17` | muted |
| 19 | `#case-study-18` | plain（`reverse: true`，图在左） |
| 20 | `#testimonials-19` | muted |
| 21 | `#logo-wall-20` | plain |
| 22 | `#cta-21` | accent |

## 先看这七处——我有具体怀疑

按可能出问题的程度排的。每条给出「看到了什么」+「过 / 不过」，不过的话说清哪里不对。

### 1. plain 档下的卡片边界

`.td-landing-plan`、`.td-landing-quote` 的背景色与页面背景**同色**（量过：亮色
下都是 `rgb(241,244,248)`），只靠 1px 边框区分。muted 档的节里卡片比底色亮一点，
plain 档里完全同色。

看 `#pricing-7`（muted，卡片应该浮起来）与 `#testimonials-19`（muted）——这两个
都在 muted 档，所以是好的情形。**真要判断的是**：如果把某个卡片类 section 放进
plain 档，那 1px 边框够不够让人看出"这是一张卡"？如果不够，我需要给卡片一个比
canvas 更亮/更暗一档的表面色。

### 2. 条形图里 3.2% 那根条

`#bar-chart-16` 第二根是「首屏 JS 3.8 KB」，算出来 3.2%，实测宽 15px。
**它看起来是一根很短的条，还是看起来像没渲染出来？** 15px 在 470px 的轨道里
可能读作"空的"。如果是后者，我该给填充加一个最小宽度（比如 `min-inline-size:
2px` 已经有了轨道高度那么宽的圆角，可能需要更多）。

### 3. capabilities 的 partial 档图标

`#capabilities-17` 第二条「32 种语言」状态是 `partial`，我用的图标是
`angle-down`（向下的箭头）——因为图标库里没有"半满"那类字形。

**向下箭头能读作"部分支持"吗？** 我怀疑不能，它更像"展开"或"下载"。如果确认
不行，请说明；我会去 `data/icons.json` 里挑一个更合适的，或者放弃图标改用文字。

**已定（2026-09-03）：换成 `minus`。** 依据在 `VISUAL-REVIEW-ROUND2.md` 第 1 条。
上面「图标库里没有半满那类字形」这句里的**减号是有的**，当时没查清单。
朗读文本（"Partial"）是好的，问题只在视觉。

### 4. logo 墙的灰度 + 半透明

`#logo-wall-20` 三个 logo 都是 `grayscale(1)` + `opacity: 0.7`。fixture 里三个
用的是同一张 `hero.png`（截图，不是真 logo），所以**这一节的观感需要你替我判断
两件事**：

- 0.7 的透明度在亮色下是否已经淡到看不清？
- 悬停恢复彩色的过渡是否明显？

顺带：三个一样的图并排看起来会像渲染错了，那是 fixture 的问题不是代码的问题，
不用报。

### 5. 相邻同色节的分界

有四对相邻的节配色相同，之间没有任何分界线：

- `#hero-0` + `#metrics-1`
- `#timeline-5` + `#faq-6`
- `#pricing-compare-8` + `#code-plate-9`
- `#gallery-11` + `#markdown-12`

每节自己有 4rem 上下内边距（hero 是 5rem），所以间距是 8rem。**这个间距够不够
让人看出"这是两节"？** 还是看起来像一节里的两段？如果是后者，我需要考虑给
plain 档之间加分界。

### 6. timeline 的竖线收尾

`#timeline-5` 三条，竖线由每条自己画一段、最后一条不画。**线是否正好收在第三个
圆点上？** 有没有多出一小截，或者第二段与第三个圆点之间有断缝？

三个圆点分别是：实心（done）、空心圈（current）、淡色（planned）。**这三种一眼
能分开吗？**

### 7. 暗色模式

点右上角主题切换按钮。我量过每个颜色 token 都正确翻转了（canvas、accent、muted、
border 全部跟着走），没有卡在亮色值上的硬编码。**要你看的是观感**：

- `#cta-21` 的 accent 档在暗色下是浅蓝底 + 深色字，读起来刺眼吗？
- `#pricing-7` 那个 featured 卡的粗边框在暗色下还看得出来吗？
- `#preview-15` 的窗口外框那三个圆点在暗色下是否消失了？

## 然后逐节过一遍

1280×900 与 360×800 两个宽度各走一遍，只报**看起来不对**的：

- 元素挤在一起、或者某处留白大得突兀
- 文字与背景对比度不足（不用测数值，看着费劲就报）
- 图片变形、被拉伸、或比例不对
- 某个元素跑出容器、或者与邻居重叠
- 标题与正文的层级看不出来（哪个是标题不明显）

**已知且不用报的**：fixture 里 hero/gallery/preview/case-study/logo-wall 用的是
同一张 `hero.png`，所以同一张图会反复出现。

## 打印

Playwright 里 `page.emulateMedia({ media: 'print' })`，或浏览器打印预览。

我已经量过这些都生效了：accent 底色去掉、按钮变下划线链接、FAQ 答案全部摊开、
logo 不降饱和度、条形图换描边、窗口外框收起。**要你看的是**：整页打印出来是否
可读，有没有哪一节在纸上变成了一片空白或一团糊。

## 回报格式

**要文字结论，不是图片路径。** 出这份报告的人得自己看图后下判断 —— 图交回来没用，
我这侧 Read 一个 PNG 返回的是单个 `.` 字符（实测过：拿仓库自己的
`exampleSite/content/landing/hero.png` 验的，文件存在、960×540、Playwright 能截出
46717 字节的 PNG，只是我这侧解码不出来）。所以七处怀疑必须由看得见图的一方判断，
我拿文字结论去改代码。

七处怀疑逐条给结论，然后逐节问题列表。不用给建议怎么改——说清看到什么就行，
改法我来定。
