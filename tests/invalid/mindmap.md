---
title: mindmap 的非法输入
expect:
  - 'shortcode "mindmap" requires a nested list as its body at'
  - 'shortcode "mindmap": the body must be a nested list at'
  - 'shortcode "mindmap": unknown parameter "depth"'
  - 'shortcode "mindmap": height must be an integer between 10 and 9999'
  - 'shortcode "mindmap": expand must be a positive integer at'
  - 'shortcode "mindmap": id requires num'
---

空 body：导图的全部内容就是那个列表。

{{< mindmap caption="空的" >}}
{{< /mindmap >}}

body 写成段落而不是列表 —— 运行时找不到 `<ul>`，页面上会是一个空框。构建时说
出来，作者才知道自己该缩进。写下的字照旧渲染出来，不当作没写过。

{{< mindmap >}}
这是一段话，不是列表。
{{< /mindmap >}}

未知参数 —— 层数参数叫 `expand`。

{{< mindmap depth="2" >}}
- 根
  - 枝
{{< /mindmap >}}

高度非法退回 400，而不是让 SVG 的高度为 0（那样整张图不可见，而列表已经被
CSS 收起来了）。

{{< mindmap height="99999" >}}
- 根
  - 枝
{{< /mindmap >}}

`expand="0"` 是"一层都不展开"，那是一张只有根节点的图。退回全展开。

{{< mindmap expand="0" >}}
- 根
  - 枝
{{< /mindmap >}}

`id` 不带 `num`：`id` 是编号目标的属性。导图不编号也是完整的内容，只是不进
交叉引用表。

{{< mindmap id="x" >}}
- 根
  - 枝
{{< /mindmap >}}
