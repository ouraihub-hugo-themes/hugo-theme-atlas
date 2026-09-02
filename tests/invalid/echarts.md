---
title: echarts 的非法输入
expect:
  - 'echarts: the fence requires an option at'
  - 'echarts: cannot parse the option at'
  - 'echarts: the option must be a mapping at'
  - 'echarts: the option requires series at'
  - 'echarts: every series needs a type at'
  - 'echarts: unsupported series type "sankey"'
  - 'echarts attributes: unknown attribute "type"'
  - 'echarts: id requires num'
  - 'echarts: height must be an integer between 10 and 9999'
---

空围栏：

```echarts
```

语法错的 YAML —— 缩进对不上。构建时就说清是第几行第几列，而不是让读者在页面上
看到一片空白。

```echarts
series:
  - type: line
   data: [1, 2]
```

option 必须是一个映射，不能是数组或标量：

```echarts
[1, 2, 3]
```

没有 `series`：它是图表的全部内容，缺了 echarts 画一张空白的图而不报错。

```echarts
xAxis: { type: category }
```

`series` 里的项没有 `type`：同样是一张空白的图。

```echarts
series:
  - data: [1, 2, 3]
```

不支持的图种。八种之外的在浏览器里只会静默画不出来，因此构建时挡住。

```echarts
series:
  - type: sankey
    data: []
```

未知属性 —— 图种来自 option 里的 `series[].type`，不是围栏属性。

```echarts {type="line"}
series: [{ type: line, data: [1] }]
```

`id` 不带 `num`：`id` 是编号目标的属性，没有编号就没有可引用的东西。

```echarts {id="x"}
series: [{ type: line, data: [1] }]
```

高度不是正整数就退回默认的 360，而不是让容器高度为 0（那样整张图不可见）。

```echarts {height="0"}
series: [{ type: line, data: [1] }]
```
