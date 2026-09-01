---
title: banner 模式
type: blog
featured_image: banner
featured_image_alt: 对角渐变的网格测试图
weight: 30
description: 正文顶部的一张图，占文档流。
---

本页是 `banner`：特征图是内容的一部分，占文档流，不是背景。

因此它与另两种模式的无障碍处理相反 —— banner 带 `alt`，还把 alt 文本重复成
`figcaption` 当图注。它是读者要看的东西，不是气氛。

`aspect-ratio: 16 / 9` 配 `object-fit: cover`：作者给什么比例的图，版位都是同一
个高度，列表页里一排卡片不会因为某张图特别高而错位。最高 26rem，打印时收到
12rem 并 `break-inside: avoid`。

`decoding="async"` 但不 lazy：特征图在首屏，懒加载首屏图片会推迟 LCP。
