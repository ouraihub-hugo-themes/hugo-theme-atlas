---
title: API
type: swagger
weight: 30
description: swagger 壳：与 docs 同骨架，留给 OpenAPI 渲染器的位置。
---

这一段在 `swagger` 壳里。壳本身与 `docs` 同构 —— body 上的 `td-shell-swagger`
是给 OpenAPI 渲染器留的钩子，不改变栅格。

渲染器本身（`swagger` / `redoc` shortcode）归期 3 的第 5 批：它们要加载外部
runtime，而主题的约束是"未完整配置前不联网，正常构建不下载任何东西"。壳先就位，
渲染器随那一批一起来。
