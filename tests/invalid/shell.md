---
title: 外壳参数的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建。
reading_width: huge
expect:
  - 'invalid reading_width "huge"'
  - 'allowed: slim | normal | wide'
  - 'using "normal"'
---

`reading_width` 只收 `slim` / `normal` / `wide`。本页写了 `huge`，应当 warn
一次并回退 `normal`，构建照常出站。

回退值不是"不设量度"而是 `normal`：非法输入要落到与默认一致的状态，否则作者
改错一个值会得到一个既不是他想要的、也不是默认的第三种布局。
