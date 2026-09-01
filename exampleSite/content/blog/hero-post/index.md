---
title: hero 模式
type: blog
featured_image: hero
featured_image_alt: 对角渐变的网格测试图
weight: 10
description: 页顶满幅背景，导航栏浮在图上。
---

本页是 `hero`：特征图铺满页顶，正文整体下压 `clamp(150px, 32vh, 360px)` 给它
让位。窄屏换成 `clamp(96px, 22vh, 220px)` —— 小屏上按大屏的比例留白会把内容
整个推出首屏。

图用 `z-index: -1` 沉到内容之下，它的容器带 `isolation: isolate`。少了这一句，
负 z-index 会穿透到更外层的层叠上下文，图片跑到页面背景之后彻底看不见。

遮罩是 `linear-gradient(to bottom, #000 30%, transparent 96%)`：上段 30% 保持
不透明，才压得住浮在其上的导航栏文字；96% 处收干，与页面底色之间没有硬边。

装饰图一律 `aria-hidden` 且 `alt=""`。它承载的信息已经由标题和正文给出，让屏幕
阅读器再读一遍图片说明只是噪音。

`forced-colors` 与打印下这张图撤掉，并收回为它留的空白 —— 那两种场景下读者要的
是确定的对比度和省墨，背景图只会干扰。
