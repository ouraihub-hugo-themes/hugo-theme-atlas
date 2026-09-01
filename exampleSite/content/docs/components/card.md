---
title: 卡片
weight: 50
description: 网格、图标、徽章、配图、整卡可点。
---

`cards` 是容器，`card` 是一张卡。列数不给参数 —— 网格按可用宽度 auto-fit。

{{< cards >}}
  {{< card title="安装" link="/docs/" icon="rocket" >}}
  三条命令装完。支持 **macOS**、Linux、WSL。
  {{< /card >}}
  {{< card title="配置" link="/docs/components/" icon="gear" badge="新" >}}
  所有开关都在 `params.ui` 下面。
  {{< /card >}}
  {{< card title="没有链接的卡" icon="book" >}}
  标题渲染成 `<strong>` 而不是 `<a>`，整卡也就不可点。
  {{< /card >}}
{{< /cards >}}

## 只有标题

描述是可选的。

{{< cards >}}
  {{< card title="第一步" >}}{{< /card >}}
  {{< card title="第二步" >}}{{< /card >}}
  {{< card title="第三步" >}}{{< /card >}}
  {{< card title="第四步" >}}{{< /card >}}
{{< /cards >}}

## 配图

`image` 走和正文图片同一套解析：页面资源 → section 资源 → 全局 `assets/`。
`image_alt` 缺省即装饰图，卡片的可访问名字由标题承担。

{{< cards >}}
  {{< card title="带配图" link="/docs/components/image/" image="fixture-960x540.png" image_alt="示例图" >}}
  图用 `object-fit: contain` 而不是 `cover` —— 卡片配图常是截图，裁掉边缘等于裁掉信息。
  {{< /card >}}
  {{< card title="装饰图" image="fixture-960x540.png" >}}
  没写 `image_alt`，输出 `alt=""`，屏幕阅读器跳过它。
  {{< /card >}}
{{< /cards >}}

## 描述里的链接

整卡可点靠标题的 `::after` 铺满卡面。描述里的链接要盖过那层覆盖层才点得到。

{{< cards >}}
  {{< card title="外层链接" link="/docs/" icon="link" >}}
  这里还有[另一个链接](/docs/components/code/)，它不该被卡片的覆盖层吃掉。
  {{< /card >}}
{{< /cards >}}

## 描述里的代码块

shortcode body 是独立的 Goldmark 文档，里面 render hook 的 `.Ordinal` 从 0
重数。作用域前缀由 `content/render-block.html` 在渲染前写进 Page Store，
所以这个围栏的 id 不会和页面上的第一个围栏撞。

{{< cards >}}
  {{< card title="带围栏的卡" >}}
  ```sh
  hugo server -D
  ```
  {{< /card >}}
{{< /cards >}}

页面级的围栏（对照它的 id）：

```sh
echo "页面级"
```
