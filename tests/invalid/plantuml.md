---
title: plantuml 的非法输入
expect:
  - 'plantuml: the fence requires a diagram'
  - 'plantuml attributes: unknown attribute "server"'
  - 'plantuml: id requires num'
  - 'plantuml: params.ui.plantuml.server must be an absolute http(s) URL'
  - 'plantuml: unsupported params.ui.plantuml.format "gif"'
---

空围栏：

```plantuml
```

未知属性 —— `server` 不开放给作者：一篇文档能指定自己的渲染服务器，等于让任何
能提交内容的人决定图发到哪台机器。

```plantuml {server="https://evil.example"}
Alice -> Bob: hi
```

`id` 不带 `num`：`id` 是编号目标的属性，没有编号就没有可引用的东西。

```plantuml {id="x"}
Alice -> Bob: hi
```

后两条警告来自站点配置，由 `scripts/check-warnings.js` 写入的 `hugo.toml` 触发：
`server` 是相对路径（PlantUML 服务器只能是绝对地址），`format` 不在白名单。
两者都退回"未配置"，所以上面这些围栏渲染的是源码而不是 `<img>` —— 回落路径
和非法配置在同一次构建里一起验。
