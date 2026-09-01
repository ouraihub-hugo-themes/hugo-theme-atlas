---
title: 引入、注释、贡献者的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建，不进 exampleSite。
expect:
  - 'shortcode "include" requires parameter file'
  - 'shortcode "include": file must not be empty'
  - 'shortcode "include": file must not contain ..'
  - 'shortcode "include" code must be true or false'
  - 'shortcode "include": lang requires code=true'
  - 'shortcode "include": lang "js html" is not a language name'
  - 'was not found in page resources, assets, or content/'
  - 'shortcode "include": unknown parameter "fil"'
  - 'shortcode "include" takes named parameters only'
  - 'shortcode "comment" takes no parameters'
  - 'shortcode "contributors": data must name one top-level data file'
  - 'shortcode "contributors": data file "missing" was not found'
  - 'shortcode "contributors": class contains unsafe characters'
  - 'shortcode "contributors": unknown parameter "dat"'
  - 'contributors data "notamap" must be a map'
  - 'contributors data "noitems" requires items'
  - 'contributors data "itemsnotalist": items must be a list'
  - 'contributors data "broken": item 0 must be a map'
  - 'contributors data "broken": item 1 requires a valid github handle'
  - 'contributors data "broken": item 2 requires a valid github handle'
  - 'contributors data "broken": item 3 requires a valid github handle'
  - 'contributors data "broken": duplicate github handle "HUGO"'
  - 'name for "wrongtypes" must be a string'
  - 'role for "wrongtypes" must be a string'
  - 'url for "wrongtypes" must be a string'
  - 'avatar for "wrongtypes" must be a string'
  - 'url for "badurl" must not use a protocol-relative URL'
  - 'unsupported avatar for "badavatar" scheme "javascript"'
---

## include

file 缺失：

{{< include >}}

file 是空白：

{{< include file="   " >}}

file 里有 `..`：

{{< include file="../../secrets.txt" >}}

code 不是布尔：

{{< include file="whatever.md" code="yes" >}}

lang 没有 code=true：

{{< include file="whatever.md" lang="js" >}}

lang 不是语言名（带空格会被解析成围栏属性）：

{{< include file="whatever.md" code=true lang="js html" >}}

文件不存在（上面几条也会撞到这一条，这里是唯一只错这一处的）：

{{< include file="nowhere.md" >}}

参数名拼错了：

{{< include fil="whatever.md" >}}

位置参数形式：

{{< include "whatever.md" >}}

## comment

comment 不吃参数：

{{< comment note="给参数" >}}这段话照样不渲染。{{< /comment >}}

## contributors

data 不是标识符：

{{< contributors data="../etc/passwd" >}}

数据文件不存在：

{{< contributors data="missing" >}}

class 里有不安全字符：

{{< contributors data="broken" class="ok\"><script>" >}}

参数名拼错了：

{{< contributors dat="broken" >}}

## 数据文件的坏记录

四份坏数据在 `tests/invalid-data/` 下。它们的警告在数据被读到时产出，所以要
真的引用一次：

{{< contributors data="notamap" >}}

{{< contributors data="noitems" >}}

{{< contributors data="itemsnotalist" >}}

`broken.yaml` 在上面 class 那条里已经被读过一次。
