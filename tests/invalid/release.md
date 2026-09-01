---
title: 发布与资产的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建，不进 exampleSite。
expect:
  - 'shortcode "release-assets" requires release_url front matter or base'
  - 'shortcode "release-assets": algo must be md5, sha1, sha256, or sha512'
  - 'shortcode "release-assets": group must be auto'
  - 'shortcode "release-assets": src must not be empty'
  - 'shortcode "release-assets": src and inner checksum lines are mutually exclusive'
  - 'shortcode "release-assets": src resource "nowhere.txt" was not found'
  - 'shortcode "release-assets" requires checksum lines or src'
  - 'shortcode "release-assets": base must not contain a query or fragment'
  - 'shortcode "release-assets": base must be an http(s) or root-relative URL'
  - 'shortcode "release-assets": unsupported base scheme "ftp"'
  - 'shortcode "release-assets": unknown parameter "algorithm"'
  - 'shortcode "release-card" takes no parameters'
---

## release-assets 缺基址

既没有 release_url front matter 也没有 base：

{{< release-assets >}}
9f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8  a.tar.gz
{{< /release-assets >}}

## 参数本身不合格

algo 不在名单里：

{{< release-assets base="https://example.org/d" algo="crc32" >}}
9f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8  a.tar.gz
{{< /release-assets >}}

group 不是 auto：

{{< release-assets base="https://example.org/d" group="os" >}}
9f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8  a.tar.gz
{{< /release-assets >}}

参数名拼错了：

{{< release-assets base="https://example.org/d" algorithm="sha256" >}}
9f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8  a.tar.gz
{{< /release-assets >}}

## src

src 是空白：

{{< release-assets base="https://example.org/d" src="  " >}}{{< /release-assets >}}

src 与正文里的校验和同时给：

{{< release-assets base="https://example.org/d" src="sums.txt" >}}
9f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8  a.tar.gz
{{< /release-assets >}}

src 指的资源不存在：

{{< release-assets base="https://example.org/d" src="nowhere.txt" >}}{{< /release-assets >}}

两个都没给：

{{< release-assets base="https://example.org/d" >}}{{< /release-assets >}}

## base

带查询串（后面要接文件名，`?v=1` 会变成 `?v=1/name`）：

{{< release-assets base="https://example.org/d?v=1" >}}
9f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8  a.tar.gz
{{< /release-assets >}}

mailto 不是基址：

{{< release-assets base="mailto:a@example.org" >}}
9f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8  a.tar.gz
{{< /release-assets >}}

scheme 不在白名单（由共享 URL 策略拦下）：

{{< release-assets base="ftp://example.org/d" >}}
9f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8  a.tar.gz
{{< /release-assets >}}

## release-card

不吃参数：

{{< release-card tag="v9.9.9" >}}
