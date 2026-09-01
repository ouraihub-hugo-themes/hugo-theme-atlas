---
title: 编号与交叉引用
weight: 80
description: fig / tbl / eg 三种编号目标，与 xref 生成的语言正确的引用。
---

编号目标登记到页面上，`xref` 查登记表生成链接。三种版式约定取自出版惯例：图的
题注在下，表的题注在上，示例的题注是画框的头栏。

## 图

{{< fig num="1" caption="一张有固有尺寸的图" src="fixture-960x540.png" />}}

正文也可以是任意块级内容，不一定是图片：

{{< fig num="2" caption="正文是代码而不是图片" >}}
```text
+-------+     +-------+
| shell | --> | prose |
+-------+     +-------+
```
{{< /fig >}}

`alt` 缺省取 `caption`。显式 `alt=""` 仍是"这是装饰图"的正式写法，会被尊重 ——
带题注的图，题注已经在无障碍树里了。

编号不必连续，也不必是整数：

{{< fig num="10" caption="编号 10，排在图 2 之后而不是图 1 之后" >}}
下面那个列表按正文顺序排，不按 id 排 —— 按 id 排的话 `fig-10` 会落到 `fig-2`
前面。
{{< /fig >}}

{{< fig num="A.1" caption="附录里的图，编号是 A.1" >}}
`num` 的字符集是 `[0-9A-Za-z.-]`，`A.1`、`3-bis` 这类人写的形式都收。
{{< /fig >}}

## 表

{{< tbl num="1" caption="三种目标的版式约定" >}}
| 目标 | 题注位置 | 对齐 |
|---|---|---|
| `fig` | 下 | 居中 |
| `tbl` | 上 | 靠前 |
| `eg` | 头栏 | 靠前 |
{{< /tbl >}}

表格正文过普通的渲染路径，所以表格 render hook 照常接管滚动包裹与粘连表头 ——
这个 shortcode 只加编号、锚点与题注。

## 示例

{{< eg num="1" caption="题注是画框的头栏" >}}
```ts
export function init(doc: Document = document): void {
  const nodes = [...doc.querySelectorAll("[data-td-nav-key]")];
  if (nodes.length === 0) return;
}
```
{{< /eg >}}

正文恰好是一个代码块时贴着框边：框已经画了边和圆角，代码块不该再画第二层。

## 引用

同页引用：{{< xref fig="1" />}} 是那张图，{{< xref tbl="1" />}} 是那张表，
{{< xref eg="1" />}} 是那段示例。标签的词序由 i18n 决定 —— 英文 "Figure 1"、
中文"图 1"，作者手写就得为每种语言各写一遍。

自定义链接文字：{{< xref fig="2" >}}见上面那张代码图{{< /xref >}}。

任意锚点：{{< xref anchor="引用" >}}回到本节{{< /xref >}}。

跨页引用：{{< xref page="/docs/components/marker" anchor="按键" >}}按键那一节{{< /xref >}}。

## 目录列表

`book-figures` / `book-tables` / `book-examples` 列出本页所有对应目标，按正文里
出现的顺序 —— 不是按 id 排序，那样"图 10"会排到"图 2"前面。

{{< book-figures >}}

{{< book-tables title="本页的表" >}}

`page=` 可以列另一页的目标。列表先取一次目标页的 `.Content`：Hugo 不保证页面的
渲染顺序，目标页还没渲染时它的登记表是空的。

`book-toc` 列出本 section 的目录树，根取 `.FirstSection` —— 跟侧栏同一个根。
一份 book 的目录就是它侧栏的内容，两处给出不同的树是 bug 而不是特性。

{{< book-toc depth="2" >}}

`depth` 是"往下几层 section"，不是"几层标题"。
