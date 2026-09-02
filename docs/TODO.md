# 未完成事项

**这是「还剩什么」的唯一权威清单。** 期次的完成定义、已过的验收、有意简化的
理由留在 `PLAN.md`；环境与陷阱在 `HANDOFF.md`。这份只回答一个问题：现在还有
什么没做。

做完一项就从这里删掉，同时更新 `PLAN.md` 对应小节。**不要在这里记已完成的
事** —— 那会让这份清单需要被读完才知道剩什么，而它存在的理由正是不必读完。

截至 2026-09-02，期 0 到期 5 已完成（实测：29 shortcode、15 render hook、
22/22 landing section、4 个阅读外壳、103 个单测）。剩下的是期 6 加五条视觉
判断。

## 卡在别人手上的

### 五条视觉判断 · `VISUAL-REVIEW-ROUND2.md`

**等一个看得见图的评审。** 这一侧 Read 一个 PNG 返回单个 `.` 字符（实测），
所以视觉结论必须由别人给，这一侧拿文字结论改代码。

1. **capabilities「部分支持」档的图标** —— 要用户拍板，不只是看一眼。52 个
   图标里没有半圆/减号/短横。候选与各自的问题写在 ROUND2 第 1 条。
   建议：**去掉图标**，三档的朗读文本已各自都在，图标是装饰而没有正确字形。
2. **pricing-compare 的勾与叉能否一眼分开** —— 无障碍问题（14 对 12 尺寸接近，
   若颜色是唯一线索则色觉障碍下不可靠），值得答对而不是凭感觉。
3. **command-box 顶部灰条** —— 32px 按钮放在约 40px 的带子里是否仍显空旷。
4. **plain 档卡片的 1px / 14% 边框够不够** —— 亮暗各看一次。
   ⚠️ **这一条卡着一次仓库回退**：`exampleSite/content/landing/index.md:293`
   的 `#testimonials-19` 现在是临时 `tone: plain`，为了让评审看到最坏情形
   （卡片底色与页面同色）。判断完要改回 `muted`。
5. **打印整页逐节过** —— 第一轮明确留白的那一项。只回答「有没有哪节在纸上
   变成空白、一团糊、或叠在一起」。已排除项见 ROUND2 第 5 条。

另有两条「有就报，没有别硬找」的观察项（symbol id 撞标题锚点、symbol 泄漏成
可见内容），量化指标都是绿的,要眼睛确认。

### 六条第一轮确认的缺陷，在改

`VISUAL-REVIEW-FINDINGS.md` 判不过的六条，已收下：`#logo-wall-20` 灰度过重、
`#logo-wall-20` 三图整体偏右、相邻同色节 8rem 分界不足（四对）、暗色
`#cta-21` 亮度跳变、`#metrics-1` 四项基线不齐、`#capabilities-17` 布局散。

## 期 6 · 输出格式与收尾

这一期是剩下的全部路线图。文档自估 ~7 批 / 5h。

- [ ] **32 locales** —— 现在 **1/32**。这一侧 schema 97 键，参照 190 键，
      只有 21 键重合：**76 个键是这个主题独有的**，参照译文帮不上，要靠
      `--sync` 铺英文兜底。量最大但最机械。
- [ ] **print 输出** —— `baseof.print.html` 不存在。34 个 CSS 文件已有
      `@media print`，缺的是输出格式模板与 `print:` variant 全量核对。
      建了之后**重新判 `render-table.print`**（`PLAN.md:281` 当时的结论是
      「没有可挂的输出格式」，前提会变）。
- [ ] **LLMS / BookManifest / Markdown / RSS** —— `exampleSite/hugo.toml` 里
      没有 `[outputs]` 配置，现有输出变体只有 `render-table.rss.xml`。
      其余 hook 的 RSS 变体要各自实测，不能外推（`PLAN.md:292`）。
- [ ] **无效配置 warn + fallback 全量核对** —— 24 个非法输入用例在门禁里，
      但不是全量。禁止 `errorf`。
- [ ] **文档** —— README 现 94 行 8 节。缺两样：`@theme` 替代 Sass 覆盖的
      定制入口说明；消费方契约（必须跑 `npx pagefind --site public`，以及
      Chroma 需要站点侧 `noClasses = false`）。

**验收**：`--panicOnWarning` 通过；四态输出（HTML/print/md/RSS）快照齐；
32 locale schema 一致。

## 有意推迟，不是砍掉

- **侧栏宽度拖拽**（期 2）—— 三个 token 已就位，桌面端宽度够用。拖拽要引入
  指针捕获、双向 RTL、键盘等价操作与又一份持久化状态，成本约等于一个带外部
  runtime 的组件，收益只是「能调 268px 到 480px」。**等有人真的要求再做。**
- **pagefind 换栈** —— 期 6 之后单独评估。
- **另起文档站** —— 期 6 之后，不占当前分期。

## 自己能验的一条线索

`#pricing-7` 的 `scroll-margin-top` 是 0，而 navbar 是 50px sticky —— 锚点
跳转会不会被遮住，第一轮没验（`VISUAL-REVIEW-FINDINGS.md:219`）。与视觉无关，
不必等评审。

## 需要眼睛但不属于五条的

logo 墙恢复彩色的悬停过渡，静态截图验不了，第一轮到现在没验过
（`VISUAL-REVIEW-FINDINGS.md:205`）。
