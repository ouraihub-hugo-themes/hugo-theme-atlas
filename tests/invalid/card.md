---
title: 卡片的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建，不进 exampleSite。
expect:
  - 'shortcode "card" must sit inside cards'
  - 'shortcode "card" needs a title'
  - 'shortcode "card" needs a non-empty title'
  - 'unknown parameter "titel"'
  - 'shortcode "cards" takes no parameters'
  - 'image_alt needs image'
  - 'icon: unknown name "no-such-icon"'
  - 'unsupported link scheme "javascript"'
---

card 不在 cards 里：

{{< card title="孤儿卡" >}}正文{{< /card >}}

标题缺失：

{{< cards >}}
  {{< card >}}没有标题{{< /card >}}
{{< /cards >}}

标题是空白：

{{< cards >}}
  {{< card title="   " >}}空白标题{{< /card >}}
{{< /cards >}}

未知参数：

{{< cards >}}
  {{< card title="拼错了" titel="真正想写的" >}}正文{{< /card >}}
{{< /cards >}}

cards 收到了参数：

{{< cards cols="3" >}}
  {{< card title="正常" >}}{{< /card >}}
{{< /cards >}}

image_alt 没有 image：

{{< cards >}}
  {{< card title="孤零零的 alt" image_alt="描述" >}}{{< /card >}}
{{< /cards >}}

未知图标名：

{{< cards >}}
  {{< card title="图标名错了" icon="no-such-icon" >}}{{< /card >}}
{{< /cards >}}

非法链接（javascript: 协议）：

{{< cards >}}
  {{< card title="危险链接" link="javascript:alert(1)" >}}{{< /card >}}
{{< /cards >}}
