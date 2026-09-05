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
      - value: "31"
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
          - 全部 31 个 shortcode
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
        values: ["31", "31", "31"]
      - feature: 私有仓库
        values: [false, true, true]
      - feature: 响应时间
        values: [社区, 工作日, 4 小时]
      - feature: 合规审计
        values: [false, false, true]

  - type: code-plate
    title: 说明配代码
    subtitle: 代码块拼一段真围栏喂给 hook —— 高亮、复制按钮、文件名标题栏全都跟着来。
    body: |
      左边这段渲染 Markdown，所以能写 `code`、[链接](/docs/)、列表。
      右边那块与正文里的代码块长得一样、行为也一样。
    lang: yaml
    filename: hugo.yaml
    code: |
      module:
        imports:
          - path: github.com/example/hugo-theme-atlas
    actions:
      - text: 看配置文档
        href: /docs/
        style: secondary

  - type: command-box
    tone: muted
    title: 一条命令装完
    commands: |
      hugo mod init github.com/you/site
      hugo mod get github.com/example/hugo-theme-atlas
    note: 复制按钮来自代码块 hook —— 这一节没有自己的一套。

  - type: gallery
    title: 截图
    subtitle: 与 ```gallery 围栏同一份栅格标记。条目从 YAML 读，不在这里插一套微语法。
    items:
      - src: hero.png
        alt: 亮色主题下的文档页
        description: 三栏布局，左侧导航、正文、右侧目录。
      - src: hero.png
        alt: 暗色主题下的同一页
        description: 配色跟着系统，也能手动切。
      - src: hero.png
        alt: 窄屏下的同一页
        description: 导航收进抽屉，目录移到正文上方。

  - type: markdown
    title: 没有专门 section 的东西
    body: |
      一段自由 Markdown。出路给那些没有专门 section 的内容 —— 一段说明、一张表、
      一段自定义标记。

      | 键 | 作用 |
      | --- | --- |
      | `body` | 必需，渲染 Markdown |

      它不是万能 section：有专门 section 的东西用专门的，手搓一份卡片栅格得到的
      是没有 `.td-card` 语义的一堆 div。

  - type: contributors
    tone: muted
    title: 贡献者
    subtitle: 数据来自 `data/contributors.yaml`，与 contributors shortcode 同一份数据和同一份标记。

  - type: download
    title: 下载
    subtitle: 整块走 download/resolve + download/render —— 版本号只能来自数据文件。
    data: atlas

  - type: preview
    tone: muted
    title: 整幅截图
    image: hero.png
    image_alt: 文档页的完整截图，三栏布局
    caption: 有 `caption` 时整块是 `<figure>`，说明与图的关联能被辅助技术读出来。
    frame: true

  - type: bar-chart
    title: 零 JS 的条形对比
    subtitle: |
      条长由内联的 `--td-bar` 给。走 echarts 要 434 KB（量过：333 共享 + 79 core
      + 22 bar），而这一节要画的是"谁大谁小"。
    items:
      - label: 首屏 CSS
        value: 42
        display: 42 KB
      - label: 首屏 JS
        value: 3.8
        display: 3.8 KB
      - label: 字体
        value: 118
        display: 118 KB

  - type: capabilities
    tone: muted
    title: 能力清单
    subtitle: 三档状态各配一份仅供朗读的文本 —— 图标是装饰，读屏软件会跳过它。
    items:
      - title: 四种阅读外壳
      - title: 32 种语言
        status: partial
        note: schema 齐，多数是英文兜底
      - title: 联网功能默认开启
        status: no
        note: 完整配置之前一律关着
      - title: 打印样式
        note: 每个组件各自的静态展开形态

  - type: case-study
    title: 一个案例
    subtitle: 与 code-plate 同一条栅格定义，右侧放图而不是代码。
    body: |
      左侧是叙述加一组小指标，右侧是图。`reverse: true` 把图放到左边 —— 只换视觉
      顺序，DOM 顺序不动，键盘与读屏软件仍然先到文字。
    image: hero.png
    image_alt: 案例站点的截图
    reverse: true
    metrics:
      - value: 3.8 KB
        label: 首屏 JS
      - value: 155 ms
        label: 构建耗时
    actions:
      - text: 读全文
        href: /docs/
        style: secondary

  - type: testimonials
    tone: muted
    title: 引语
    subtitle: 出处在 `<figcaption>` 里而不是 `<blockquote>` 里 —— 名字不是被引的话的一部分。
    items:
      - quote: |
          它把**决定**写在注释里，而不是写在别处的文档里。半年后回来读还知道当时
          为什么那样选。
        name: 某位维护者
        role: 文档站
      - quote: 打印出来能直接用。这个在别处要自己补一整套样式。
        name: 另一位
        role: 内部手册

  - type: logo-wall
    title: 构建工具
    subtitle: alt 必需 —— 这一节的全部信息就在那些名字里。
    items:
      - src: hero.png
        alt: Hugo
        href: https://gohugo.io
      - src: hero.png
        alt: Tailwind CSS
      - src: hero.png
        alt: esbuild

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
