---
title: 数据图表
weight: 109
description: echarts 围栏，八种图，option 在构建时校验，按图种拆 chunk。
---

`echarts` 围栏里是 [echarts 的 option](https://echarts.apache.org/zh/option.html)，
JSON 或 YAML 都行。**option 在构建时解析**：写错一个逗号，`hugo` 就指到具体
位置，而不是页面上一片空白。

支持八种图：`line` `bar` `pie` `scatter` `radar` `heatmap` `tree` `graph`。
每种一个 chunk —— 一篇只有折线图的文档不下载关系图的代码。

## 折线

```echarts {caption="按图种拆 chunk 之后，一篇只有折线图的文档的下载量。" height="320"}
xAxis:
  type: category
  data: [无图表, 折线, 折线+柱, 折线+柱+饼]
yAxis:
  type: value
  name: KB
series:
  - type: line
    name: gzip 后传输量
    data: [0, 208, 216, 222]
    smooth: true
tooltip:
  trigger: axis
```

YAML 写的 option 在构建时被转成 JSON，运行时只认一种格式。用 JSON 写也一样：

## 柱状

```echarts {height="300"}
{
  "xAxis": { "type": "category", "data": ["mermaid", "echarts", "markmap", "asciinema"] },
  "yAxis": { "type": "value", "name": "KB (gzip)" },
  "series": [{ "type": "bar", "data": [241, 269, 241, 66] }],
  "tooltip": { "trigger": "axis" }
}
```

## 饼图

```echarts {height="320"}
series:
  - type: pie
    radius: [40%, 70%]
    data:
      - { value: 175, name: 共享 chunk }
      - { value: 13, name: 渲染器 }
      - { value: 16, name: 通用组件 }
      - { value: 8, name: 折线图 }
legend: { bottom: 0 }
tooltip: { trigger: item }
```

## 散点

```echarts {height="300"}
xAxis: { type: value, name: 原始 KB }
yAxis: { type: value, name: gzip KB }
series:
  - type: scatter
    symbolSize: 12
    data: [[733, 269], [184, 66], [1517, 417], [1072, 322]]
tooltip: {}
```

## 雷达

```echarts {height="340"}
radar:
  indicator:
    - { name: 图种齐全, max: 5 }
    - { name: 零运行时, max: 5 }
    - { name: 离线可用, max: 5 }
    - { name: 打印清晰, max: 5 }
    - { name: 上手简单, max: 5 }
series:
  - type: radar
    data:
      - { value: [3, 5, 5, 5, 4], name: goat }
      - { value: [5, 1, 5, 3, 4], name: mermaid }
      - { value: [5, 1, 5, 2, 3], name: echarts }
legend: { bottom: 0 }
```

## 热力图

`heatmap` 的颜色映射来自 `visualMap`，缺了它整张图是一个颜色 —— 运行时把这两个
模块绑在一起 import。

```echarts {height="280"}
xAxis: { type: category, data: [周一, 周二, 周三, 周四, 周五] }
yAxis: { type: category, data: [上午, 下午, 晚上] }
visualMap: { min: 0, max: 10, calculable: true, orient: horizontal, left: center, bottom: 0 }
series:
  - type: heatmap
    data: [[0,0,5],[0,1,7],[0,2,2],[1,0,6],[1,1,9],[1,2,3],[2,0,4],[2,1,8],[2,2,1],[3,0,7],[3,1,10],[3,2,2],[4,0,3],[4,1,5],[4,2,0]]
    label: { show: true }
```

## 树

```echarts {height="340"}
series:
  - type: tree
    data:
      - name: layouts
        children:
          - name: _markup
            children: [{ name: render-codeblock-echarts }, { name: render-codeblock-mermaid }]
          - name: _shortcodes
            children: [{ name: cast }, { name: fig }]
    orient: LR
    label: { position: left, align: right }
    leaves: { label: { position: right, align: left } }
```

## 关系图

```echarts {height="320"}
series:
  - type: graph
    layout: force
    roam: true
    data:
      - { name: 围栏, symbolSize: 40 }
      - { name: option JSON, symbolSize: 30 }
      - { name: 运行时, symbolSize: 30 }
      - { name: 图种 chunk, symbolSize: 24 }
    links:
      - { source: 围栏, target: option JSON }
      - { source: option JSON, target: 运行时 }
      - { source: 运行时, target: 图种 chunk }
    force: { repulsion: 200 }
    label: { show: true }
```

## 编号与引用

给了 `num` 就登记进交叉引用表，和 `fig`、`mermaid` 走同一条路 —— 一张折线图和
一张图片在"图 3"这个说法里没有区别。

```echarts {num="1" caption="带编号的图表可以被 xref 引用。" height="240"}
xAxis: { type: category, data: [一, 二, 三] }
yAxis: { type: value }
series: [{ type: bar, data: [3, 5, 2] }]
```

上面那张是 {{< xref fig="1" />}}。

## 回落与打印

画出来之前（以及 JS 没跑、chunk 没下下来、数据画不出图时），页面上是那段 JSON。
图表的源码就是数据本身，读者读得懂 —— 这比一片空白有用。

打印时图和数据都留：canvas 打得出来，但它是屏幕分辨率的位图，纸上会发虚。

深浅色切换后图会重画：轴线与文字的颜色是 `setOption` 时定的，改 CSS 变量改不动
画布里的像素。
