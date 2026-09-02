---
title: OpenAPI 渲染器
weight: 10
description: swagger 与 redoc shortcode 渲染一份 OpenAPI 文档，runtime 由站点自己给。
---

`swagger` 和 `redoc` 把一份 OpenAPI 文档渲染成可浏览的页面。两个都在是因为取向
不同：Swagger UI 带"试一下"的交互面板，Redoc 是三栏只读排版。选哪个是你的事。

## 主题不打包 runtime

swagger-ui 是 1.5 MB，redoc 是 1.1 MB。装了主题的站点九成没有 API 文档，不该为此
背上这些字节 —— 所以主题出 shortcode、容器、样式和初始化那几行，**runtime 的地址
由你配**：自托管一份，或指向 CDN。

没配的话 shortcode 只渲染一个指向 spec 的链接。这不是降级：OpenAPI 文档本身是
JSON 或 YAML，能 `curl` 取、能导进 Postman、能喂给代码生成器。渲染器让它好看，
不是让它可读。

构建时不联网 —— 脚本是读者的浏览器去取的。

```toml
[params.ui.openapi.swagger]
js = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"
css = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"
integrity = "sha384-..."
css_integrity = "sha384-..."

[params.ui.openapi.redoc]
js = "https://cdn.jsdelivr.net/npm/redoc@2/bundles/redoc.standalone.js"
integrity = "sha384-..."
```

自托管的话把文件放进 `static/`，地址写站内路径：

```toml
[params.ui.openapi.redoc]
js = "/js/vendor/redoc.standalone.js"
```

### integrity 不是可选项，除非同源

跨域脚本被换掉等于任意代码在你读者的浏览器里执行。配了跨域 `js` 却没给
`integrity`，构建时会 warn —— 那是漏了，不是不需要。

自托管、与站点同源的文件不 warn：能改那个文件的人已经能改页面本身了。

## 用法

`spec` 是必需的，指向 OpenAPI 文档：

```
{{</* swagger spec="/api/openapi.json" */>}}
{{</* redoc spec="https://api.example.com/openapi.yaml" height="900" */>}}
```

下面这个 runtime 没配（示例站不联网），所以你看到的是回落链接 —— 也就是没配时
读者看到的东西：

{{< redoc spec="/api/openapi.json" height="240" >}}

## 参数

| 参数 | 作用 |
| --- | --- |
| `spec` | OpenAPI 文档地址，必需 |
| `height` | 容器最小高度，默认 720 |
| `id` | 容器 id，便于外部锚点；默认按序号生成 |

`spec` 过主题的 URL 策略：控制字符、协议相对地址、`javascript:` 一类 scheme 一律
丢弃并 warn，不做修补。

## 打印

打印时渲染器隐藏，回落链接出来。这两个库都是可展开可交互的布局，纸上不成立 ——
纸上读者能拿到的是那个地址。
