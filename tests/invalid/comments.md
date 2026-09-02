---
title: 评论区的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建。
expect:
  - 'comments: params.ui.comments is missing category, category_id'
---

giscus 的四个必需键在站点配置里，够不到页面 front matter —— 所以坏配置写在
scripts/check-warnings.js 那份内联 hugo.toml 里，与 plantuml 同一个位置。这一页
只负责声明该出哪条警告。

**「配了一半」是唯一值得测的形状。** 四个键一个都不配是「没开评论」，不该报任何
东西；而少一个的 giscus 不是「功能弱一点」，是 iframe 里一句读者看不懂的英文
报错 —— 站点作者在自己机器上很可能不往下滚到那儿。所以有任何一个键就检查全部
四个，缺哪些就报哪些名字，评论区整个不渲染。

那份配置同时还错了两处，各自单独 warn（不在 expect 里逐条列，因为 repo 形状那条
在缺键那条之后才求值，一次构建只能观察到先发生的那些）：

- `repo` 写成了完整 URL。这是最容易写出来的一种 —— giscus 收的是 `owner/name`
  短形式，它拿去拼 API 请求，一个 URL 进去只会在 iframe 里报错。
- `mapping = "slug"` 不在允许集里。这条回退到 `pathname` 而不是关掉整个评论区：
  惩罚要与错误相称，一个拼错的 mapping 不该让评论消失。
