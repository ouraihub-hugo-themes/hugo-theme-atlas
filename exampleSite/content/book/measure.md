---
title: 阅读量度
type: book
reading_width: normal
weight: 10
description: slim 48rem、normal 70rem、wide 无上限。
---

`reading_width` 有三档：

| 值 | 量度 | token |
|---|---|---|
| `slim` | 48rem | `--td-shell-read-slim` |
| `normal` | 70rem | `--td-shell-read-normal` |
| `wide` | 无上限 | 无 —— 就是 grid 的 `minmax(0, 1fr)` |

本页是 `normal`。

约束挂在主列而不是 `.td-prose` 上：list 模板的正文是 `.td-prose` 加一个兄弟
列表，挂在 prose 上会让列表溢出到量度之外。

打印时三档一律解除 —— 纸面宽度由纸决定，留着会在页面右侧切出一条空白。

## 无效值

写 `reading_width: huge` 会 warn 并回退 `normal`，构建照常。这条由
`validate-enum.html` 统一处理，不是每个壳各写一遍。
