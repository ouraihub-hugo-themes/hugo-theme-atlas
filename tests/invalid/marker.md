---
title: 行内标记的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建，不进 exampleSite。
expect:
  - 'shortcode "kbd" takes positional parameters only'
  - 'shortcode "kbd" needs at least one key'
  - 'shortcode "kbd": keys must not be empty'
  - 'shortcode "badge" needs text'
  - 'shortcode "badge" needs a non-empty text'
  - 'shortcode "badge": unknown parameter "tone_"'
  - 'invalid tone "loud"'
  - 'allowed: neutral | info | success | warning | danger'
  - 'unsupported link scheme "javascript"'
  - 'icon: unknown name "no-such-icon"'
  - 'shortcode "param" requires a page or site parameter name'
  - 'shortcode "param" takes positional parameters only'
  - 'parameter "no_such_param" was not found in page front matter or site configuration'
  - 'parameter "expect" is a []string'
  - 'only scalar values (string / number / bool) can be printed'
---

kbd 给了名字参数：

{{< kbd key="Ctrl" >}}

kbd 一个键都没有：

{{< kbd >}}

kbd 的键是空白（第二个键，序列里其余的照常渲染）：

{{< kbd Ctrl "   " >}}

badge 完全没有参数：

{{< badge >}}

badge 的 text 是空白：

{{< badge text="   " >}}

badge 的参数名拼错了：

{{< badge text="拼错了" tone_="info" >}}

badge 的 tone 不在名单里：

{{< badge text="音量" tone="loud" >}}

badge 的链接是 javascript: 协议：

{{< badge text="危险" link="javascript:alert(1)" >}}

badge 的图标名不存在：

{{< badge text="图标错了" icon="no-such-icon" >}}

param 没给名字：

{{< param >}}

param 给了名字参数而不是位置参数：

{{< param name="title" >}}

param 要的参数不存在：

{{< param no_such_param >}}

param 要的参数不是标量（`expect` 本身是个 slice）：

{{< param expect >}}
