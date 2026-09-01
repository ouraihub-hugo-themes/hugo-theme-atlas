---
title: math / chem / eq 的非法输入
expect:
  - 'math: the fence requires an expression'
  - 'math: title must not be empty'
  - 'math attributes: unknown attribute "size"'
  - 'chem: the fence requires an equation'
  - 'chem: title must not be empty'
  - 'math: KaTeX could not render the expression'
  - 'shortcode "eq" requires TeX content'
  - 'shortcode "eq": parameter "caption" requires num'
  - 'shortcode "eq": parameter "id" requires num'
  - 'shortcode "eq": unknown parameter "align"'
---

空围栏：

```math
```

```chem
```

空 title 与未知属性：

```math {title=""}
x = 1
```

```chem {title=""}
H2O
```

```math {size=large}
x = 1
```

KaTeX 认不出的公式 —— 警告并原样留下作者写的文本：

```math
\frac{
```

`eq` 没有正文：

{{< eq num="1" >}}
{{< /eq >}}

不给 `num` 却给了 `caption` 与 `id`：那两个都是编号目标的属性。

{{< eq caption="没有编号" id="x" >}}
x = 1
{{< /eq >}}

未知参数：

{{< eq num="2" align="left" >}}
y = 2
{{< /eq >}}
