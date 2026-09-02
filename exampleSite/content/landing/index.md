---
title: Landing 示例
layout: landing
sections:
  - type: hero
    eyebrow: 0.1.0
    headline: 用 `sections` 数组搭首页
    tagline: |
      每个 section 是一个 map，`type` 决定用哪个模板。顺序就是数组顺序 ——
      不用给 section 起 `01-hero` 这样的名字来排序。
    image: hero.png
    actions:
      - text: 读文档
        href: /docs/
        style: primary
        icon: book
      - text: 组件清单
        href: /docs/components/
        style: secondary
      - text: 仓库
        href: https://example.org/repo
        style: text

  - type: metrics
    title: 一些数字
    subtitle: 用 `<dl>` 而不是一排 `<div>` —— 值与标签要能被读屏软件关联起来。
    items:
      - value: "29"
        label: shortcode
      - value: "22"
        label: landing section
        note: 这一批四个
      - value: "32"
        label: 语言
      - value: 0.1.0
        label: 版本

  - type: cards
    tone: muted
    title: 卡片走同一份标记
    subtitle: 与 `card` shortcode 共用 `content/card-markup.html`。两套标记意味着改一次样式要动两处。
    items:
      - title: 安装
        href: /docs/
        icon: rocket
        body: 三条命令装完。支持 **macOS**、Linux、WSL。
      - title: 配置
        href: /docs/components/
        icon: gear
        badge: 新
        body: 所有开关都在 `params.ui` 下面。
      - title: 没有链接的卡
        icon: book
        body: 标题渲染成 `<strong>`，整卡也就不可点。

  - type: cta
    tone: accent
    title: 收尾那一块
    subtitle: 带底色、居中、一组按钮。这个排版是固定形态，不该让每个站点自己搓一遍。
    actions:
      - text: 开始
        href: /docs/
        style: primary
      - text: 先看看组件
        href: /docs/components/
        style: secondary
---

正文在 section 之后输出。landing 页多数没有正文，但直接丢掉作者写的东西不合适。

`tone` 三档：`plain`（默认）、`muted`、`accent`。成套给而不是让作者填十六进制
—— 那会做出对比度不足的组合。
