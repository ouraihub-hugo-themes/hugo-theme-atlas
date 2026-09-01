---
title: 步骤的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建。
expect:
  - 'shortcode "steps" takes no parameters'
---

steps 只吃 Inner，任何参数都是作者的误会（比如以为能配列数或起始值）：

{{% steps start="3" %}}

### 一

### 二

{{% /steps %}}
