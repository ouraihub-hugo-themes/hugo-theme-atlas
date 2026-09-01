---
title: 引入与注释
weight: 95
description: 把另一个文件的内容搬进当前页面，或者在正文里留话给下一个维护者。
---

## 引入代码

`code=true` 把文件包成围栏交给代码块 hook，所以引入的代码自动带上复制按钮、
折叠和行号 —— 不是另写一套。`lang` 决定高亮。

{{< include file="snippet.toml" code=true lang="toml" >}}

上面那个 `snippet.toml` 是本页的页面资源，走解析顺序的第一档。

## 引入 Markdown

不给 `code` 时按 Markdown 在当前页的上下文里渲染。

{{< include file="snippets/prose.md" >}}

## 解析顺序

三档，依次尝试：

{{< fields >}}
  {{< field name="页面资源" type="1" >}}
  `.Page.Resources.Get` —— 与页面同在一个 leaf bundle 里的文件。上面的
  `snippet.toml` 是这一档。
  {{< /field >}}

  {{< field name="assets" type="2" >}}
  `resources.Get` —— `assets/` 下的文件，或任何挂到 `assets` 的目录。上面的
  `snippets/prose.md` 是这一档。
  {{< /field >}}

  {{< field name="content" type="3" >}}
  `content/` 下的文件。开头的 `/` 表示 content 根，否则相对当前页所在目录。
  content 根从页面文件反推，所以把 `contentDir` 改成 `docs` 的站点也对。
  {{< /field >}}
{{< /fields >}}

`file` 里出现 `..` 一律拒掉。这是信任边界 —— 作者写的路径会直接进
`os.ReadFile`，允许它就等于允许读 `content/` 之外的任何文件。

## 注释

`{{%/* comment */%}}` 的 body 不进渲染结果：

{{< comment >}}
这段话不会出现在页面上。它也不会渲染 —— 注释掉的 `{{</* fig */>}}` 不会
占掉一个图号。
{{< /comment >}}

上面那个块渲染出的是空。模板里那句取 `.Inner` 写成 `{{ if false }}` 包着的形式：
Hugo 靠静态扫描模板里出现过 `.Inner` 来决定这个 shortcode 允不允许成对调用，
而真去取值会把 body 当独立文档渲染，嵌在注释里的 shortcode 就跟着跑了。

## 贡献者

数据来自 `data/contributors.yaml`，不联网 —— 主题在构建时不打 GitHub API：
那会让离线构建失败，也会把限流问题带进每一次 `hugo server`。

{{< contributors >}}

`github` 是必填项，其余四个可选：`name` 缺省用 handle，`role` 缺省不显示，
`url` 缺省是 GitHub 主页，`avatar` 缺省画首字母占位块 —— 上面第四、第五个格子
是这一档，占位块与图片同尺寸，缺图那一格不会塌。
