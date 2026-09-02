---
title: swagger 与 redoc 的非法输入
expect:
  - 'shortcode "swagger" requires spec at'
  - 'shortcode "redoc" requires spec at'
  - 'shortcode "swagger": unknown parameter "url"'
  - 'redoc: spec must not contain whitespace or control characters'
  - 'swagger: unsupported spec scheme "javascript"'
  - 'redoc: spec must not use a protocol-relative URL'
  - 'shortcode "swagger": height must be an integer between 10 and 99999'
  - 'shortcode "redoc": spec must be an http(s) or site-relative URL at'
---

没有 `spec`：渲染器的全部内容就是那份文档，没有它没什么可渲染的。

{{< swagger >}}

{{< redoc height="400" >}}

未知参数 —— 参数叫 `spec`，不叫 `url`。拼错的参数在 Hugo 里是静默不存在。

{{< swagger url="/api/openapi.json" >}}

带控制字符的 spec：URL 里的换行能被用来伪造请求头。下面 `openapi` 后面是一个
真的 TAB —— 换行走不到这条检查，Hugo 的词法分析先报 unterminated quoted string，
整个构建失败。

{{< redoc spec="/api/openapi	.json" >}}

`javascript:` 不在白名单。

{{< swagger spec="javascript:alert(1)" >}}

协议相对地址跟随页面协议，HTTP 页面上会静默降级。

{{< redoc spec="//cdn.example.com/openapi.json" >}}

高度非法退回 720，而不是让容器高度为 0（那样渲染器画完也看不见）。

{{< swagger spec="/api/openapi.json" height="0" >}}

`mailto:` 是合法 URL 但不是一份 OpenAPI 文档 —— 作者写了它说明配错了。

{{< redoc spec="mailto:api@example.com" >}}
