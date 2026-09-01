---
title: 发布与资产
weight: 100
description: 版本卡片，与一段 sha*sum 输出变成的下载表。
release_url: https://github.com/gohugoio/hugo/releases/tag/v0.165.0
date: 2026-08-12
---

## 发布卡片

不吃参数。发布事实来自 front matter 的 `release_url` —— 允许在 shortcode 上覆盖，
就等于允许同一页上出现两个互相矛盾的版本号。

{{< release-card >}}

四个链接全都从那一条 URL 算出来：发布页、两个源码归档、仓库首页。只认 GitHub
release URL 的全文，是因为让作者分别写 owner / repo / tag 三个键就有三处可以各自
写错，而错法是静默的 —— 拼错的 owner 生成一个 404，看不出是哪一段错了。

## 资产表

基址来自同一个 `release_url`。校验和不联网核对，也不下载文件：这是一张排版表，
事实由作者提供。

{{< release-assets >}}
9f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8  hugo_extended_0.165.0_linux-amd64.tar.gz
1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809  hugo_extended_0.165.0_darwin-universal.tar.gz
2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a *hugo_extended_0.165.0_windows-amd64.zip
{{< /release-assets >}}

算法按十六进制长度判断，不让作者声明：`sha256sum` 的输出里没有算法名，而长度是
无歧义的。`algo="sha256"` 可以声明期望值 —— 长度不符时就是一条明确的警告，拿
md5 当 sha256 发布是真实存在的事故。

第三行是二进制模式（`<hex><空格>*<name>`），coreutils 两种形式都产出，两种都认。

## 按格式分组

`group="auto"` 按包格式分组。顺序由主题定：装了就能用的包格式在前，要自己解的
压缩包在后。

{{< release-assets group="auto" >}}
3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b  hugo_0.165.0_linux-amd64.rpm
4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c  hugo_0.165.0_linux-arm64.deb
5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d  hugo_0.165.0_linux-riscv64.tar.gz
6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e  hugo_0.165.0_windows-amd64.exe
708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f  hugo_0.165.0_darwin-arm64.dmg
8192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f70  SOURCES
{{< /release-assets >}}

系统与架构的徽章是从文件名猜的，猜不出就留空 —— 一个标着 Linux 的 Windows 包会
让人下错，不猜比猜错好。最后那行 `SOURCES` 没有后缀也没有平台词，所以归 `*`
且没有徽章。

## 从文件读

`src` 指向一个页面资源或 assets 里的文件，内容与写在正文里等价。发布流水线产出
的 `SHA256SUMS` 可以直接引，不用粘一遍。

{{< release-assets src="snippets/checksums.txt" >}}{{< /release-assets >}}

`src` 与正文里的校验和互斥 —— 两个都给时哪一份生效都是猜，所以那是一条警告。

## 独立基址

没有 `release_url` 的页面用 `base`。两个都给是作者的误会：一个页面只能属于一个
发布，所以那是一条警告而不是一个优先级规则。

校验和列在屏幕上截断（前 8 后 4）—— 一条 sha512 是 128 个字符，完整铺开会把文件名
挤到没有余地，而没人靠肉眼比对校验和，那是复制按钮的活。完整值在同一格里，
只在朗读、打印和没有 JS 时出现。整段复制按钮产出的是 `sha256sum -c` 能直接吃的
格式：两个空格分隔，末尾带换行。
