---
title: 下载区的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建，不进 exampleSite。
expect:
  - 'shortcode "download" requires exactly one positional data key'
  - 'download key must match'
  - 'data/download/missing.yaml was not found'
  - 'download data has unsupported field "chanels"'
  - 'download version is required in data or site params.version'
  - 'download repo must be an owner/repository pair'
  - 'download tag contains unsupported path characters'
  - 'download channels must not be empty'
  - 'download channels must be an array'
  - 'shortcode "download": duplicate data key "badchannels"'
  - 'download channel 1: must be a map'
  - 'download channel 2: has unsupported field "titel"'
  - 'download channel 3: id must match'
  - 'has duplicate id "dup"'
  - 'kind must be rolling or pinned'
  - 'title must resolve to a non-empty string'
  - 'title must not interpolate version facts'
  - 'note must not be empty'
  - 'note must not interpolate version facts'
  - 'icon must be a string'
  - 'rolling download channel url must not interpolate version facts'
  - 'has unknown interpolation variable "${branch}"'
  - 'has malformed interpolation syntax'
  - 'step 1: must be a map'
  - 'step 2: has unsupported field "lng"'
  - 'step 3: code is required'
  - 'step 4: code must not be empty'
  - 'lang must be one lexer token'
  - 'steps must be an array'
  - 'checksums must be a string'
  - 'checksums must not be empty'
  - 'checksums must not interpolate version facts'
  - 'checksums and checksums_src are mutually exclusive'
  - 'checksums_src resource "nowhere/sums.txt" was not found'
  - 'checksums are valid only for a pinned channel'
  - 'pinned links/assets require download repo'
---

## 参数形式

没给参数：

{{< download >}}

给了两个：

{{< download "a" "b" >}}

key 不是标识符：

{{< download "../etc/passwd" >}}

数据文件不存在：

{{< download "missing" >}}

## 记录级错误

这些是每个渠道都要用的事实，缺了它们渲染出的每个链接都是错的，所以整块丢弃：

{{< download "bad" >}}

{{< download "noversion" >}}

{{< download "badrepo" >}}

{{< download "badtag" >}}

{{< download "nochannels" >}}

{{< download "channelsnotalist" >}}

## 重复调用

同一份数据在一页上渲染两次会让每个元素 id 都撞车，锚点跳向哪一个由浏览器随便挑：

{{< download "badchannels" >}}

{{< download "badchannels" >}}

## 步骤与校验和

坏的那一步跳过，其余照常 —— 三步里第二步写错，第一步和第三步仍然有用：

{{< download "badsteps" >}}

## pinned 缺 repo

{{< download "norepo" >}}
