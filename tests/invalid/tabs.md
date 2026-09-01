---
title: 标签页的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建。
expect:
  - 'shortcode "tab" must sit inside tabs at'
  - 'shortcode "tab" must sit inside tabs, not "cards"'
  - 'shortcode "tab" needs a label at'
  - 'shortcode "tab" needs a non-empty label at'
  - 'shortcode "tab": unknown parameter "labl"'
  - 'shortcode "tabs": unknown parameter "grp"'
  - 'shortcode "tabs" takes named parameters only'
  - 'shortcode "tabs": group must match'
  - 'shortcode "tab": value must match'
  - 'shortcode "tab": value needs tabs to declare a group'
  - 'shortcode "tab": value is required because tabs declares group "g10"'
  - 'shortcode "tab": duplicate value "same"'
  - 'shortcode "tabs": default needs group'
  - 'shortcode "tabs": default "bun" matches no tab value'
  - 'shortcode "tabs" takes tab children only'
  - 'shortcode "tabs" needs at least one tab'
---

## 1 tab 在顶层

{{< tab label="孤儿" >}}没有父级。{{< /tab >}}

## 2 tab 在别的父级里

{{< cards >}}
  {{< tab label="放错了" >}}cards 不是 tabs。{{< /tab >}}
{{< /cards >}}

## 3 tab 完全没有参数

`.Params` 是 nil，对它调 isset 会让 Hugo 报类型错，所以这条必须在 isset 之前拦下。

{{< tabs >}}
  {{< tab >}}没有 label。{{< /tab >}}
{{< /tabs >}}

## 4 label 是空白

{{< tabs >}}
  {{< tab label="  " >}}只有空格不算名字。{{< /tab >}}
{{< /tabs >}}

## 5 参数名拼错

Hugo 会静默忽略认不出的参数，所以未知参数必须自己喊出来 —— 不然作者看到的是
"label 没生效"。

{{< tabs >}}
  {{< tab labl="拼错了" >}}正文。{{< /tab >}}
{{< /tabs >}}

## 6 tabs 的参数名拼错

{{< tabs grp="pm" >}}
  {{< tab label="一" >}}正文。{{< /tab >}}
{{< /tabs >}}

## 7 tabs 用位置参数

{{< tabs "pm" >}}
  {{< tab label="一" >}}正文。{{< /tab >}}
{{< /tabs >}}

## 8 group 形状不对

group 进 hash 与 localStorage 键，且要能和 value 用 `-` 拼起来后仍可解析。

{{< tabs group="PM" >}}
  {{< tab label="一" >}}正文。{{< /tab >}}
{{< /tabs >}}

## 9 value 形状不对

{{< tabs group="g9" >}}
  {{< tab label="一" value="Yarn" >}}大写进不了 id。{{< /tab >}}
{{< /tabs >}}

## 10 value 没有 group

无 group 的组不同步，写死 value 没有意义。

{{< tabs >}}
  {{< tab label="一" value="one" >}}正文。{{< /tab >}}
{{< /tabs >}}

## 11 group 没有 value

{{< tabs group="g10" >}}
  {{< tab label="一" >}}同步的键缺了。{{< /tab >}}
{{< /tabs >}}

## 12 value 重复

{{< tabs group="g11" >}}
  {{< tab label="一" value="same" >}}前一个。{{< /tab >}}
  {{< tab label="二" value="same" >}}后一个赢。{{< /tab >}}
{{< /tabs >}}

## 13 default 没有 group

{{< tabs default="one" >}}
  {{< tab label="一" >}}正文。{{< /tab >}}
{{< /tabs >}}

## 14 default 对不上任何 value

{{< tabs group="g13" default="bun" >}}
  {{< tab label="pnpm" value="pnpm" >}}正文。{{< /tab >}}
{{< /tabs >}}

## 15 tabs 里有游离内容

tabs 只吃 tab 子节点，它自己的 Inner 不该有可见输出。

{{< tabs >}}
这行不属于任何标签页。
  {{< tab label="一" >}}正文。{{< /tab >}}
{{< /tabs >}}

## 16 空的 tabs

{{< tabs group="g15" >}}{{< /tabs >}}
