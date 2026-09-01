---
title: 字段表的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建，不进 exampleSite。
expect:
  - 'shortcode "field" must sit inside fields'
  - 'shortcode "field" requires parameter name'
  - 'shortcode "field": name must not be empty'
  - 'shortcode "field": type must not be empty'
  - 'required must be boolean'
  - 'shortcode "field" requires a non-empty description'
  - 'shortcode "field": unknown parameter "requred"'
  - 'shortcode "fields" accepts field children only'
  - 'shortcode "fields" requires at least one field child'
  - 'shortcode "fields": label must not be empty'
  - 'shortcode "fields": unknown parameter "lable"'
---

field 不在 fields 里：

{{< field name="孤儿" >}}说明{{< /field >}}

name 缺失：

{{< fields >}}
  {{< field >}}没有名字{{< /field >}}
{{< /fields >}}

name 是空白：

{{< fields >}}
  {{< field name="   " >}}空白名字{{< /field >}}
{{< /fields >}}

type 是空白：

{{< fields >}}
  {{< field name="a" type="  " >}}空白类型，字段本身照常渲染{{< /field >}}
{{< /fields >}}

required 不是布尔：

{{< fields >}}
  {{< field name="b" required="yes" >}}说明{{< /field >}}
{{< /fields >}}

`default` 非标量那条分支在这里覆盖不到：shortcode 的参数不是模板表达式，写不出
slice 或 map。同一类判断（非标量 warn 并不输出）由 `param` 的夹具覆盖，那边能从
front matter 取到真正的 slice。模板里那条分支保留 —— shortcode 参数将来若支持
更多类型，它是唯一的拦截点。

没有说明：

{{< fields >}}
  {{< field name="d" >}}{{< /field >}}
{{< /fields >}}

参数名拼错了：

{{< fields >}}
  {{< field name="e" requred=true >}}说明{{< /field >}}
{{< /fields >}}

fields 里有游离正文：

{{< fields >}}
  这段文字不是 field 子元素。
  {{< field name="f" >}}说明{{< /field >}}
{{< /fields >}}

fields 一个子元素都没有：

{{< fields label="空表" >}}{{< /fields >}}

fields 的 label 是空白：

{{< fields label="   " >}}
  {{< field name="g" >}}说明{{< /field >}}
{{< /fields >}}

fields 的参数名拼错了：

{{< fields lable="拼错了" >}}
  {{< field name="h" >}}说明{{< /field >}}
{{< /fields >}}
