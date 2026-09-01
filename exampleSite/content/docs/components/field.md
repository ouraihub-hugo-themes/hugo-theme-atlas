---
title: 字段表
weight: 90
description: API 参数、配置键那类"名字 + 类型 + 说明"的列表。
---

{{< fields label="params.ui" >}}
  {{< field name="shell_type" type="string" default="docs" >}}
  阅读外壳。取值 `docs` / `book` / `blog` / `swagger`，或 `shell_types` 里
  自定义的名字。

  说明是完整的 Markdown：能放段落、列表、围栏。
  {{< /field >}}

  {{< field name="reading_width" type="string" default="normal" >}}
  阅读量度，三档：`slim` / `normal` / `wide`。约束挂在主列上，不是挂在正文块上。
  {{< /field >}}

  {{< field name="sidebar" type="bool" default=true >}}
  侧栏开关。`false` 时栅格收成两列。
  {{< /field >}}

  {{< field name="api_key" type="string" required=true >}}
  必需字段的 `required` 用状态色标出来，是这一行里唯一带颜色的元信息。
  {{< /field >}}

  {{< field name="retries" type="int" default=0 >}}
  `default=0` 与"没有默认值"是两件事，所以用单独的标志位判断 —— 直接看值的
  真假会让 `0`、`false`、`""` 三个合法的默认值都消失。
  {{< /field >}}

  {{< field name="prefix" type="string" default="" >}}
  空字符串默认值显示成 `""`，不是一片空白 —— 后者读起来像"忘了写"。
  {{< /field >}}
{{< /fields >}}

## 只有名字和说明

类型、`required`、默认值都是可选的。

{{< fields >}}
  {{< field name="hugo" >}}
  一条只有名字和说明的字段。
  {{< /field >}}

  {{< field name="tailwind" >}}
  没有 `label` 时不画组标题，列表直接开始。
  {{< /field >}}
{{< /fields >}}

## 同名字段

一页上可以有好几组字段表，两组里都出现 `timeout` 是正常的。锚点按 slug 计数，
第二个起加后缀 —— id 撞车的话 `href="#field-timeout"` 指向哪一个由浏览器随便挑。

{{< fields label="第二组" >}}
  {{< field name="shell_type" type="string" >}}
  这一条的锚点是 `#field-shell_type-2`，上面那一条是 `#field-shell_type` ——
  下划线是标识符字符，slug 保留它。
  {{< /field >}}
{{< /fields >}}

用 `dl` 而非 `ul`：这是术语与释义的配对，屏幕阅读器会报"定义列表，6 项"并把
名字与说明关联起来。元信息之间插一个仅供朗读的逗号 —— 视觉上靠间距和颜色区分，
朗读时 "shell_type string default docs" 听起来像四个词而不是三项信息。
