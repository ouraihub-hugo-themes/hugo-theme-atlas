---
title: 编号与交叉引用的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建，不进 exampleSite。
expect:
  - 'shortcode "fig" requires parameter num'
  - 'num must not be empty'
  - 'num must match [0-9A-Za-z.-]+'
  - 'caption must be a string'
  - 'class contains unsafe characters'
  - 'shortcode "fig" requires src or inner content'
  - 'src and inner content are mutually exclusive'
  - 'width must be a positive integer'
  - 'shortcode "eg" requires a non-empty caption'
  - 'shortcode "tbl" requires inner table content'
  - 'duplicate id "fig-dup"'
  - 'duplicate fig number "7"'
  - 'contains characters that cannot appear in an id or fragment'
  - 'must not start with a digit or a hyphen'
  - 'shortcode "xref" accepts only one of fig, tbl, eq, or eg'
  - 'shortcode "xref" requires fig, tbl, eq, eg, or anchor'
  - 'an anchor-only reference requires inner link text'
  - 'was not found in language en'
  - 'shortcode "book-equations" found no eq targets'
  - 'depth must be an integer from 1 through 3; got "deep"'
  - 'depth must be an integer from 1 through 3; got "9"'
  - 'unknown parameter "captoin"'
---

fig 没给 num：

{{< fig caption="没有编号" >}}正文{{< /fig >}}

num 是空白：

{{< fig num="   " caption="空白编号" >}}正文{{< /fig >}}

num 有非法字符：

{{< fig num="2 3" caption="编号里有空格" >}}正文{{< /fig >}}

caption 不是字符串：

{{< fig num="4" caption=4 >}}正文{{< /fig >}}

class 有非法字符：

{{< fig num="5" class="a<b" >}}正文{{< /fig >}}

fig 既没有 src 也没有正文：

{{< fig num="6" caption="空的" >}}{{< /fig >}}

src 与正文同时给了：

{{< fig num="6b" src="nope.png" >}}正文也给了{{< /fig >}}

width 不是正整数：

{{< fig num="6c" src="nope.png" width="wide" >}}{{< /fig >}}

参数名拼错了：

{{< fig num="6d" captoin="拼错了" >}}正文{{< /fig >}}

id 撞车（两个 fig 用同一个 id）：

{{< fig num="7" id="fig-dup" >}}第一个{{< /fig >}}

{{< fig num="8" id="fig-dup" >}}第二个{{< /fig >}}

编号撞车（同一种目标，同一个 num，不同 id）：

{{< fig num="7" id="fig-other" >}}编号跟上面那个撞了{{< /fig >}}

id 含不能进 id 的字符：

{{< fig num="9" id="has space" >}}正文{{< /fig >}}

id 以数字开头：

{{< fig num="9b" id="1st" >}}正文{{< /fig >}}

tbl 没有正文：

{{< tbl num="1" caption="空表" >}}{{< /tbl >}}

eg 没有 caption：

{{< eg num="1" >}}正文{{< /eg >}}

xref 同时给了两种 kind：

{{< xref fig="1" tbl="1" />}}

xref 什么都没给：

{{< xref />}}

xref 只给了 anchor 但没有链接文字：

{{< xref anchor="somewhere" />}}

xref 指向不存在的页面：

{{< xref page="/no/such/page" anchor="somewhere" >}}文字{{< /xref >}}

列表在一个没有对应目标的页面上。用 eq 来证：本页有一堆 fig，但没有任何 eq。

{{< book-equations >}}

book-toc 的 depth 不是数字：

{{< book-toc depth="deep" >}}

book-toc 的 depth 超出 1–3：

{{< book-toc depth="9" >}}
