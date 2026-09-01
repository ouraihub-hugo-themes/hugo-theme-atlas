---
title: 标签页
weight: 70
description: 分组同步、深链、持久化、键盘导航。
---

一组标签页。不给 `group` 就是独立的一组，切换不影响页面上其他组。

{{< tabs >}}
  {{< tab label="Homebrew" >}}
  ```sh
  brew install hugo
  ```
  {{< /tab >}}
  {{< tab label="Debian / Ubuntu" >}}
  ```sh
  sudo apt install hugo
  ```
  {{< /tab >}}
  {{< tab label="从源码" >}}
  ```sh
  go install github.com/gohugoio/hugo@latest
  ```
  {{< /tab >}}
{{< /tabs >}}

## 分组同步

同名 `group` 的组一起切换，选择写进 URL hash 与 `localStorage` —— 一篇文档里
选了 pnpm，往下翻的每一组都跟着变，下次回来还是 pnpm。

`group` 存在时每个 `tab` 必须给 `value`：那是同步的键，也是深链的锚点。

{{< tabs group="pm" default="pnpm" >}}
  {{< tab label="pnpm" value="pnpm" >}}
  ```sh
  pnpm add -D tailwindcss
  ```
  {{< /tab >}}
  {{< tab label="npm" value="npm" >}}
  ```sh
  npm install -D tailwindcss
  ```
  {{< /tab >}}
  {{< tab label="yarn" value="yarn" >}}
  ```sh
  yarn add -D tailwindcss
  ```
  {{< /tab >}}
{{< /tabs >}}

同一组的第二次出现。切上面任意一个，这里跟着变：

{{< tabs group="pm" >}}
  {{< tab label="pnpm" value="pnpm" >}}pnpm 的锁文件是 `pnpm-lock.yaml`。{{< /tab >}}
  {{< tab label="npm" value="npm" >}}npm 的锁文件是 `package-lock.json`。{{< /tab >}}
  {{< tab label="yarn" value="yarn" >}}yarn 的锁文件是 `yarn.lock`。{{< /tab >}}
{{< /tabs >}}

id 前缀：同一组第一次出现保留 `组名-值`（深链目标 `#pm-npm`），之后的加序号
后缀，避免一页里出现重复 id。

## 缺项的同组

一组里没有当前选中的 value 时，它保持原样 —— 同步绝不能让某一组变成"没有
选中项"。这一组只有 pnpm 和 npm，切到 yarn 时它停在原处：

{{< tabs group="pm" >}}
  {{< tab label="pnpm" value="pnpm" >}}只有这两个。{{< /tab >}}
  {{< tab label="npm" value="npm" >}}没有 yarn。{{< /tab >}}
{{< /tabs >}}

## 键盘导航

一组标签页在 Tab 键序里只占一站，组内用左右方向键走，两端环绕，Home/End 跳
首尾。RTL 下左右互换 —— 视觉上的下一个在左边。

Home/End 不受 RTL 影响：它们指的是序列首尾，不是屏幕左右。

## 无 JS

服务端渲染出的结构本身可用：默认 panel 可见，其余带 `hidden`；每个 panel 里
重复一次标签名。没有 JS 时读者看到第一个标签页的内容，切换没有，但内容不丢。
运行时接管后 CSS 隐藏那些重复的标题。

打印时所有 panel 摊开、标题回来当分段线索、标签栏隐藏。
