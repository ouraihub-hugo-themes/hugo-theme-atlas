---
title: 行内标记
weight: 70
description: 按键序列与徽章，两个嵌在句子里的小块。
---

## 按键

命令面板是 {{< kbd Ctrl Shift P >}}，Mac 上是 {{< kbd Cmd Shift P >}}。保存用
{{< kbd Ctrl S >}}，单键写一个就行：{{< kbd Esc >}}、{{< kbd Tab >}}、
{{< kbd "/" >}}（斜杠要引起来，裸的 `/` 会被当成闭合标签）。

参数是位置的，不是命名的 —— 按键是一个有序序列，`key1=` `key2=` 那种写法既啰嗦
又限制个数。

带空格的键名要引起来：{{< kbd Ctrl "Page Down" >}}。键名本身不折行，长序列则整体
折行：{{< kbd Ctrl Shift Alt Meta K >}}。

屏幕阅读器听到的不是"Ctrl 加号 Shift"。视觉上的 `+` 是 `aria-hidden`，旁边另有一
段仅供朗读的 "with"。

## 徽章

版本状态一类的行内标签：{{< badge text="Beta" tone="info" >}}、
{{< badge text="Stable" tone="success" >}}、
{{< badge text="Deprecated" tone="warning" >}}、
{{< badge text="Removed" tone="danger" >}}。不给 `tone` 就是
{{< badge text="Default" >}}。

可以带链接 {{< badge text="RFC 7231" tone="info" link="https://www.rfc-editor.org/rfc/rfc7231" >}}
和图标 {{< badge text="Docs" tone="info" icon="callout-note" >}}。

`text` 是纯文本，不过 Markdown —— 徽章是一个标签，里面出现段落或列表说明用错了
组件。长 token 能断行而不撑破容器：
{{< badge text="v0.1.0-alpha.20260901+build.7" >}}。

## 参数回显

`{{</* param */>}}` 打印一个页面参数：本页标题是 {{< param title >}}，权重是
{{< param weight >}}。页面上没有的参数回落站点配置 —— 版本是
{{< param product_version >}}，它只在 `hugo.toml` 的 `params` 里。

只打印标量。map 与 slice 打印出来是 Go 的字面量（`map[a:1]`），那不是作者想要的
东西 —— 警告并什么都不输出。值过 `htmlEscape`：front matter 里可以写任何字符，
未转义就进 HTML 是注入面。
