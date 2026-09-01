---
title: cast 的非法输入
expect:
  - 'shortcode "cast" requires src at'
  - 'shortcode "cast": unknown parameter "autoPlay"'
  - 'cast: src must not contain whitespace or control characters'
  - 'cast: unsupported src scheme "javascript"'
  - 'shortcode "cast": autoplay must be true or false'
  - 'shortcode "cast": speed must be a positive number'
  - 'shortcode "cast": cols must be a positive number'
  - 'shortcode "cast": poster must not contain control characters'
---

没有 `src`：录屏组件的全部内容就是那份文件，没有它没什么可渲染的。

{{< cast caption="没有 src" >}}

未知参数 —— 播放器的选项是 `autoPlay`，shortcode 上是全小写的 `autoplay`。
拼错的参数在 Hugo 里是静默不存在，不 warn 的话作者只会看到自动播放没生效。

{{< cast src="demo.cast" autoPlay=true >}}

带空白的 src：URL 里的换行能被用来伪造请求头。

{{< cast src="demo file.cast" >}}

`javascript:` 不在白名单。

{{< cast src="javascript:alert(1)" >}}

布尔项写了别的东西。空字符串不是"false"，是作者以为自己关掉了。

{{< cast src="demo.cast" autoplay="yes" >}}

倍速为 0：这段录屏永远播不完。

{{< cast src="demo.cast" speed="0" >}}

`cols` 是整数格，小数没有意义。

{{< cast src="demo.cast" cols="80.5" >}}

`poster` 里的控制字符会把标签写坏。换行走不到这条检查 —— Hugo 的词法分析先报
`unterminated quoted string`，整个构建失败。能走进模板的是制表符一类，下面那个
`npt:` 后面是一个真的 TAB。

{{< cast src="demo.cast" poster="npt:	0:03" >}}
