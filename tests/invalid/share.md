---
title: 分享条与编辑链接的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建。
share: "x"
edit_page: "yes"
expect:
  - 'params.ui.share must be a list of share targets'
  - 'edit_page must be a boolean; got yes; keeping the link'
---

`share: "x"` 是最容易写出来的那个错：只想分享到一个地方，于是把列表写成了字符串。
Go 模板里它是非空字符串，`range` 一个字符串在 Hugo 里直接报错，所以这里必须先判
`reflect.IsSlice` —— 判漏的表现不是"少一个分享按钮"而是整页构建失败。

`share: true` 是另一种，不在这一页（一页只能给一个值），实测也会报：一个 `true`
说不出要分享到哪里，所以它 warn 且不渲染分享条。而 `share: false` **不报** ——
那是关掉单页分享条的正当写法，两者在同一个键上的方向相反，这一点值得测。

未知平台名（`share: ["mysapce"]`）单独报一条并只丢那一项，其余照渲染：一个拼错
的平台名不该让另外五个也消失。

`edit_page: "yes"` 与 `search_exclude: "no"` 同一类错，回退方向也同一个道理：
非布尔值保持链接在。这两个键的"错了也还在"方向不同 —— 索引那边是"保持被索引"，
这边是"保持链接"，共同点是回退到**能看见的那一侧**，因为静默消失的东西没人会来
报告它。
