---
title: 终端录屏
weight: 110
description: cast shortcode 播放 asciicast，按需加载，不用录视频。
---

`cast` 播放一份 [asciicast](https://docs.asciinema.org/manual/asciicast/v2/) —— 用
`asciinema rec` 录出来的终端会话。它是纯文本的 JSON，一段两分钟的录屏几十 KB，
而同样长度的 MP4 是它的百倍，而且里面的命令读者复制不出来。

播放器 184 KB（gzip 66 KB）**只在录屏滚进视口时才加载**，页面本身多 1.5 KB。

{{< cast src="demo.cast" caption="一次 hugo 构建。录屏里的文本可以选中复制。" >}}

## 参数

`src` 是必需的，其余都可省。播放选项与 asciinema 播放器的 API 同名，作者照着
它的文档就能用。

| 参数 | 作用 |
| --- | --- |
| `src` | 录屏文件。页面资源、`assets/`、`static/` 或远程 URL |
| `caption` | 图注 |
| `autoplay` | 进视口自动播放。读者要求减少动效时不生效 |
| `preload` | 提前抓取录屏文件 |
| `loop` | 循环播放 |
| `speed` | 播放倍速，正数 |
| `idle` | 静默段压缩到几秒。录屏里的思考时间不用让读者一起等 |
| `cols` `rows` | 终端尺寸，正整数。缺省用录屏头部里的 |
| `poster` | 未播放时显示的一帧，如 `npt:0:12` |
| `start` | 从某个时间点开始，如 `npt:1:23` |

{{< cast src="demo.cast" idle="1" speed="2" poster="npt:0:03"
  caption="idle=1 speed=2 poster=npt:0:03：静默压到 1 秒、倍速两倍、封面取第 3 秒。" >}}

## 无障碍与回落

播放器挂上之前，页面上是一个下载链接 —— JS 没跑、文件取不到、播放器出错时它
都在。asciicast 在终端里 `asciinema play demo.cast` 就能看，比一句"你的浏览器
不支持"有用。

`autoplay` 让位于 `prefers-reduced-motion`：一段自己动起来的终端就是动效，而
CSS 关不掉它（播放是脚本行为）。读者仍然可以点播放。

打印时播放器隐藏，只留下载链接：纸上的终端录屏是一张静态图，而读者手里的纸没有
播放键。
