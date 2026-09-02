---
title: 搜索参数的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建。
search_boost: "62"
search_exclude: "no"
expect:
  - 'search_boost must be a number; got 62; using 1.0'
  - 'search_exclude must be a boolean; got no; keeping the page indexed'
---

两个键各错一种，页面仍要出站且仍要进索引。

`search_boost: "62"` 加了引号所以是字符串。判数字靠试算（`mul` 一下）而不是看
类型名 —— `printf "%T"` 的结果取决于解析器，实测 YAML 里 `42` 是 `uint64`、
`-5` 是 `int64`、`3.8` 是 `float64`，照类型名单判明天换个数就漏。字符串在算术上
不通用，而那正是要拒的。

`search_exclude: "no"` 是最值得报出来的一种：它在 Go 模板里是非空字符串，当真值
处理会把整页从索引里去掉 —— **与作者的意图恰好相反**，而页面本身看不出任何异常，
只有搜的时候发现这一页不见了。所以非布尔值一律 warn 并保持页面被索引：回退方向
要选"错了也还在"，不能选"错了就消失"。

`search_boost` 的其余三种错各有理由，不在这一页（一页只能给一个值）：

- `0` 与负数不是"不重要"而是无意义。0 让整页正文匹配不计分，那是
  `search_exclude` 的活；负数在二次标度里没有定义。两者都回退 1.0 并提示改用
  `search_exclude`。
- 大于 100 钳到 100 并 warn。不静默钳的理由是作者写 `1000` 与写 `100` 会得到
  完全一样的结果，而页面上看不出来 —— 他会以为那一页排到了别人前面。

100 这个上限来自 pagefind：它的 `data-pagefind-weight` 取值 0.0–10.0 且是二次
标度，而主题收的 `search_boost` 是线性的"重要程度倍数"，两者之间开一次平方。
100 开平方正好是 10。
