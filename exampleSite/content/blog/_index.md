---
title: 博客
type: blog
weight: 40
description: blog 壳：三种特征图模式、RSS 入口。
---

`blog` 壳与 `docs` 同一副骨架，差别在特征图：一张图有三种用法，由
`featured_image` 选。

| 模式 | 用法 |
|---|---|
| `banner` | 正文顶部的一张图，占文档流，16/9 裁切，最高 26rem |
| `wash` | 标题区背后的淡底，10% 不透明度 + 向下渐隐 |
| `hero` | 页顶满幅背景，正文整体下压 |
| `none` | 不显示（默认） |

图源按顺序找：本页自己写的 `images`、页面资源里名字像 `featured` / `feature` /
`cover` / `thumbnail` 的、最后才是继承来的 `images`。

继承来的要排在最后，是因为 `images` 会通过 cascade 落到子页上。若不区分，一个
section 配了图，它下面每一篇都会拿同一张当特征图，而作者真正想要的是各自目录里
那张 `featured.png`。
