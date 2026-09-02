---
title: Landing
weight: 60
description: 用 sections 数组搭首页，每个 section 一个 type。
---

Landing 页是一个 layout，不是阅读外壳。front matter 里写 `layout: landing`，
section 从 `sections:` 数组来：

```yaml
---
title: 首页
layout: landing
sections:
  - type: hero
    headline: 标题
    tagline: 一段说明
    actions:
      - text: 开始
        href: /docs/
        style: primary
  - type: cards
    tone: muted
    title: 一组卡片
    items:
      - title: 安装
        href: /docs/
        icon: rocket
        body: 三条命令装完。
---
```

数组而不是 map：顺序是你要控制的东西，而 Go 模板遍历 map 按键排序 —— 那意味着
你得把 section 命名成 `01-hero`、`02-cards` 才能排出想要的次序。

[看渲染结果](/landing/)。

## 公共键

每个 section 都认这几个：

| 键 | 作用 |
| --- | --- |
| `type` | 必需，决定用哪个模板 |
| `id` | 容器 id，便于导航锚点；默认 `<type>-<序号>` |
| `tone` | `plain`（默认）、`muted`、`accent` |
| `title` | 节标题，渲染成 `h2` |
| `subtitle` | 标题下的说明 |
| `eyebrow` | 标题上方那行小字 |

`tone` 是成套取值而不是让你填十六进制：每档的前景色跟着背景配好，自己填颜色
容易做出对比度不足的组合。

**`title` 与 `subtitle` 渲染 Markdown，`eyebrow` 不渲染。** 前两个是叙述，在
标题里写 `code` 或强调是常事；`eyebrow` 是标签，`*` 在里面应该显示成星号。
这个区分在每个 section 的字段上都成立：叙述字段渲染，标签字段不渲染。

拼错的键会 warn。`titel` 写成这样时 Hugo 不报错，那个键只是静默不存在 ——
页面上少一行字而构建是绿的，所以主题必须替你报出来。

## hero

一屏的标题、说明、按钮，可选配图。

| 键 | 作用 |
| --- | --- |
| `headline` | 标题，渲染成 `h1` |
| `tagline` | 标题下的说明 |
| `image` | 配图，走和正文图片同一套三层解析 |
| `actions` | 按钮组 |

标题用 `headline` 而不复用公共的 `title`：公共 `title` 出 `h2`，而 hero 的标题
就是这一页的 `h1`。两个键名分开比同一个键在不同 section 里出不同层级更少意外。

配图的 `alt` 恒为空 —— hero 图承载的信息在标题与说明里已经说过了，给它一段重复
的 alt 只是让读屏软件念两遍。真正承载信息的图放正文里用图片语法，那里 alt 必需。

图是页面资源时会自动带上 `width`/`height`。远程图拿不到固有尺寸，那时不输出
这两个属性 —— 但代价是图载入前占 0 高，载入后把下面的内容顶下去。能放本地就
放本地。

## cards

卡片网格。每项：

| 键 | 作用 |
| --- | --- |
| `title` | 必需 |
| `body` | 描述，渲染 Markdown |
| `href` | 有它则整卡可点 |
| `icon` | 一个图标名 |
| `badge` | 标题旁的小标签，纯文本 |
| `image` / `image_alt` | 配图 |

卡片和 `card` shortcode 是同一份标记，所以样式和行为一致。列数不给参数：网格按
可用宽度 auto-fit，给一个 `columns: 3` 只会让你在窄屏上手动改回来。

一项写错只丢那一项 —— 六张卡里一处笔误不该把整节打空。

## metrics

几个大数字加各自的说明。每项：

| 键 | 作用 |
| --- | --- |
| `value` | 必需，那个数字 |
| `label` | 必需，它在量什么 |
| `note` | 补充说明 |

三个字段都是纯文本：数字与它的标签是数据而不是叙述，渲染 Markdown 只会让
`1.5*` 这样的值变成斜体。

**输出是 `<dl>` 而不是一排 `<div>`。** 每项是"值 + 它是什么"的配对，读屏软件
会把两者关联起来播报；用 `div` 的话读者听到的是两段互不相干的文字。

只有 `value` 没有 `label` 的项会被丢掉：一个孤零零的 `99.9%` 读者不知道它在量
什么，而显示出来看起来像渲染成功了。

## cta

一段话加一组按钮，居中。结构上就是公共键加 `actions`，没有自己的字段 —— 但带
底色、居中、一组按钮是 landing 页收尾那一块的固定形态，让你用 `markdown`
section 手搓一遍等于把这个排版重复写进每个站点。

## actions

`hero` 与 `cta` 都用它。每项：

| 键 | 作用 |
| --- | --- |
| `text` | 必需，纯文本 |
| `href` | 必需，过主题的 URL 策略 |
| `style` | `primary`、`secondary`（默认）、`text` |
| `icon` | 一个图标名 |

`text` 不渲染 Markdown：按钮上的文字是标签，而 `<em>` 一类标记在按钮里既没
意义又会打断读屏软件的连读。

外链自动带 `rel="noopener"`。不加 `noreferrer` —— 那会把正常的来源统计一起掐掉，
而要防的是被打开的页面通过 `window.opener` 改写来源页。

一节里最多一个 `primary` 是设计意图，但不强制：强制的代价是你写了两个时第二个
静默变样，比让它难看更难查。

## 打印

纸上不留满屏底色 —— 整块 `accent` 打印出来是一页实心油墨，而它承载的信息全在
文字里。各节改用边框区隔，按钮变成带下划线的链接。
