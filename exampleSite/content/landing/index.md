---
title: Landing 示例
layout: landing
sections:
  - type: hero
    eyebrow: 0.1.0
    headline: 用 `sections` 数组搭首页
    tagline: |
      每个 section 是一个 map，`type` 决定用哪个模板。顺序就是数组顺序 ——
      不用给 section 起 `01-hero` 这样的名字来排序。
    image: hero.png
    actions:
      - text: 读文档
        href: /docs/
        style: primary
        icon: book
      - text: 组件清单
        href: /docs/components/
        style: secondary
      - text: 仓库
        href: https://example.org/repo
        style: text

  - type: metrics
    title: 一些数字
    subtitle: 用 `<dl>` 而不是一排 `<div>` —— 值与标签要能被读屏软件关联起来。
    items:
      - value: "29"
        label: shortcode
      - value: "22"
        label: landing section
        note: 这一批四个
      - value: "32"
        label: 语言
      - value: 0.1.0
        label: 版本

  - type: cards
    tone: muted
    title: 卡片走同一份标记
    subtitle: 与 `card` shortcode 共用 `content/card-markup.html`。两套标记意味着改一次样式要动两处。
    items:
      - title: 安装
        href: /docs/
        icon: rocket
        body: 三条命令装完。支持 **macOS**、Linux、WSL。
      - title: 配置
        href: /docs/components/
        icon: gear
        badge: 新
        body: 所有开关都在 `params.ui` 下面。
      - title: 没有链接的卡
        icon: book
        body: 标题渲染成 `<strong>`，整卡也就不可点。

  - type: steps
    title: 三步接上
    subtitle: 输出 `<ol class="steps">` —— 与 Markdown 里给列表标 `{.steps}` 同一份标记，零新样式。
    items:
      - title: 装模块
        body: 在 `hugo.yaml` 的 `module.imports` 里加一行。
      - title: 建 landing 页
        body: "前置元数据里写 `layout: landing`，再列 `sections`。"
      - title: 填内容
        body: 每个 section 的字段见组件文档。写错的键会 warn 并说出允许的键。

  - type: principles
    tone: muted
    title: 几条主张
    items:
      - title: 语义先行
        icon: book
        body: 先出正确的 HTML，再谈增强。JS 没跑时页面仍然可读可用。
      - title: 无效输入 warn
        icon: lock
        body: 作者写错时给一条说清怎么改的 warn，而不是让构建炸掉或静默出空白。
      - title: 默认不联网
        icon: scale-balanced
        body: 需要网络的功能在完整配置之前一律关着。一次普通构建不下载任何东西。

  - type: timeline
    title: 时间线
    subtitle: 只在日期能被机器读懂时给 `datetime`，模糊时间不塞瞎猜的值。
    items:
      - date: 2026-01-15
        title: 完整日期
        body: 三段齐全，`datetime` 原样给出。
        status: done
      - date: 2026-06
        title: 只到月
        body: 是合法的 HTML `datetime` 值，按形状认出来。
        status: current
      - date: 2027 年上半年
        title: 模糊时间
        body: 解析不了，于是不给 `datetime` 属性 —— 塞一个瞎猜的值机器会当真。
        status: planned

  - type: faq
    title: 常见问题
    subtitle: 原生 `<details>`，零 JS。页内搜索能找到收起的内容。
    items:
      - question: 为什么不做成手风琴？
        answer: |
          那会让同组里只能展开一个 —— 读者想对比两个答案时被强制收起前一个。
          FAQ 是查阅而不是导航。
      - question: 答案里能写 Markdown 吗？
        answer: |
          能。答案渲染 Markdown，所以 `code`、[链接](/docs/)、列表都可以：

          - 第一条
          - 第二条

  - type: pricing
    tone: muted
    title: 套餐
    subtitle: 价格与周期分成两个键 —— 拼成一个字符串在多语言站点上没法处理。
    items:
      - name: 社区版
        price: 免费
        description: 个人项目与试用。
        features:
          - 全部 29 个 shortcode
          - 4 种阅读外壳
          - 社区支持
        actions:
          - text: 开始用
            href: /docs/
            style: secondary
      - name: 团队版
        price: ¥299
        period: 每月
        featured: true
        badge: 最常选
        description: 多人协作与私有部署。
        features:
          - 社区版全部内容
          - 私有仓库
          - 工作日响应
        actions:
          - text: 试用 14 天
            href: /docs/
            style: primary
      - name: 企业版
        price: 联系我们
        description: 定制与合规要求。
        features:
          - 团队版全部内容
          - 专属支持
          - 合规审计
        actions:
          - text: 联系销售
            href: https://example.org/contact
            style: secondary

  - type: pricing-compare
    title: 逐项对比
    subtitle: 复用 `.matrix` 表格那一套 —— 溢出自滚、表头与首列粘连、打印展开都已经在。
    plans:
      - 社区版
      - 团队版
      - 企业版
    items:
      - feature: shortcode 数量
        values: ["29", "29", "29"]
      - feature: 私有仓库
        values: [false, true, true]
      - feature: 响应时间
        values: [社区, 工作日, 4 小时]
      - feature: 合规审计
        values: [false, false, true]

  - type: cta
    tone: accent
    title: 收尾那一块
    subtitle: 带底色、居中、一组按钮。这个排版是固定形态，不该让每个站点自己搓一遍。
    actions:
      - text: 开始
        href: /docs/
        style: primary
      - text: 先看看组件
        href: /docs/components/
        style: secondary
---

正文在 section 之后输出。landing 页多数没有正文，但直接丢掉作者写的东西不合适。

`tone` 三档：`plain`（默认）、`muted`、`accent`。成套给而不是让作者填十六进制
—— 那会做出对比度不足的组合。
