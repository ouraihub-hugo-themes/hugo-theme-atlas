---
title: 下载区
weight: 105
description: 一份数据文件变成分渠道的安装指引。
---

一个位置参数，就是 `data/download/` 下的文件名。

{{< download "atlas" >}}

版本号、仓库、tag 都是事实，只能来自数据文件 —— 允许在 shortcode 上写，同一页上
就可能出现两个互相矛盾的版本号。

## 两种渠道

`rolling` 跟着最新走，`pinned` 指向一个具体版本。区别有三处：

{{< fields >}}
  {{< field name="插值" type="仅 pinned" >}}
  `${version}` 与 `${tag}` 只在 `pinned` 渠道里展开。往"装最新版"的命令里写死
  一个版本号是自相矛盾的，所以那是一条警告。
  {{< /field >}}

  {{< field name="校验和" type="仅 pinned" >}}
  `rolling` 不指向具体版本，一组校验和挂在它下面就是错的。
  {{< /field >}}

  {{< field name="未发布置灰" type="仅 pinned" >}}
  `published: false` 时 `pinned` 置灰，`rolling` 照常可用。
  {{< /field >}}
{{< /fields >}}

上面第二个渠道的 `checksums_src` 指向 `assets/snippets/checksums.txt`，与把校验和
写在 `checksums` 里等价。两个键互斥 —— 都给时保留 `checksums` 并警告，静默让一个
覆盖另一个作者会以为自己改的那份生效了。

## 未发布

版本号定了但资产还没上传，是发布流程里的正常一段：

{{< download "pending" >}}

第一个渠道置灰了：链接是 `span` 而不是带 `aria-disabled` 的 `a`，因为一个能聚焦却
点不动的链接比一段说明文字更让人困惑。它的校验和表也置灰，而且不画复制按钮 ——
文件还拿不到，复制它的校验和没有意义。少了按钮之后 CSS 的 `:has()` 会自动把完整
校验和铺开，正是这时候读者需要看见全文。

第二个渠道照常可用。

## 步骤的代码块

步骤的命令过代码块 hook，所以复制按钮、高亮、折叠都跟着来 —— 不在下载区里重写
一套。`lang` 缺省是 `text` 而不是 `shell`：猜错语言会把命令高亮成一片乱色，不高亮
反而干净。

标题与说明可以带语言后缀（`title_zh_cn`）。回退三档：完整语言标签、主标签、无后缀
的基名。下划线而非连字符 —— YAML 的键名里连字符合法，但 Hugo 的语言标签是
`zh-cn`，两种写法混在一份数据里必然有人写错一种。
