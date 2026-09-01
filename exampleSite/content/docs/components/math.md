---
title: 公式与方程式
weight: 107
description: 构建时渲染成 MathML，不装浏览器运行时。
---

公式在构建时就渲染完了：Hugo 内建 KaTeX（`transform.ToMath`），输出纯 MathML。
**不发 katex.min.css，也不发那 1.5 MB 字体** —— 字形由浏览器的数学排版引擎负责。
同一条公式 260 字节对 1184 字节，而且没有等 JS 时的闪烁。

## 块级

```math
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
```

围栏里的反斜杠不会被 Markdown 解析器动过。`$$…$$` 之间的 `\\` 会先被当成转义
的反斜杠吃掉一层，作者得写四个 —— 围栏没这个问题：

```math
\begin{pmatrix} a & b \\ c & d \end{pmatrix}
\begin{pmatrix} x \\ y \end{pmatrix}
=
\begin{pmatrix} ax + by \\ cx + dy \end{pmatrix}
```

## 行内

行内用 `$…$`：设 $f(x) = x^2 + 1$，则 $f'(x) = 2x$。也认 LaTeX 作者习惯的
\(a^2 + b^2 = c^2\)。

**行内定界符要消费方自己开。** Hugo 忽略主题设置的 `markup`，所以主题给不了
默认值 —— 照抄 `exampleSite/hugo.toml` 里 `markup.goldmark.extensions.passthrough`
那一段。不开的话 `$E = mc^2$` 原样渲染成带美元号的文本，而 ```` ```math ````
围栏不受影响。

## 带编号

`{{</* eq num="1" */>}}` 登记进交叉引用表，`{{</* xref */>}}` 找得到它：

{{< eq num="1" caption="高斯积分" >}}
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
{{< /eq >}}

引用它：见 {{< xref eq="1" />}}。

`num` 可以不给 —— 一条不需要被引用的公式也该能用这个围栏排版：

{{< eq >}}
\lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^n = e
{{< /eq >}}

块级 `$$` 也能带 `{num=…}`，作用相同：

$$
\sum_{k=1}^{n} k = \frac{n(n+1)}{2}
$$
{num="2" caption="等差数列求和"}

## 化学方程式

`chem` 走同一条路 —— 内建的 KaTeX 带 mhchem 扩展：

```chem
CO2 + C -> 2 CO
```

`\ce{}` 不用自己写，围栏会包上。已经写了的不动（一条式子里可能有多段）：

```chem
\ce{SO4^2- + Ba^2+ -> BaSO4 v}
```

## 写错了会怎样

一条 KaTeX 认不出的公式会警告，并**原样留下作者写的文本** —— 渲染成空白的话，
作者得去翻构建日志才知道发生了什么，而留在页面上一眼就看得见。

## 编号公式的列表

{{< book-equations >}}
