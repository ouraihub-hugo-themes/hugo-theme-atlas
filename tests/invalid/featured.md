---
title: 特征图的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建。
featured_image: gigantic
expect:
  - 'invalid featured_image "gigantic"'
  - 'allowed: none | banner | wash | hero'
  - 'using "none"'
---

`featured_image` 只收 `none` / `banner` / `wash` / `hero`。本页写了 `gigantic`，
应当 warn 一次并回退 `none`。

回退到 `none` 而不是某个可见模式：作者拼错模式名时，不显示图比显示一个他没要求
的版式更容易发现问题。

配了合法模式但页面没有图时**不警告** —— `featured_image` 常写在站点配置或
cascade 里，"这一页恰好没有图"是正常情况，不是错误。那条路径在这个夹具里覆盖
不到，因为它本就不该产出任何输出。
