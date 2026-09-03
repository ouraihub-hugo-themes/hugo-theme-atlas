# hugo-theme-atlas

Hugo 文档主题。TypeScript + Tailwind CSS 4，编译为普通 CSS/JS。

语义优先的 HTML，渐进增强；组件样式集中声明，覆盖 print、RTL、forced-colors、
reduced-motion 与窄屏。

## 状态

开发中。期 0–6 的路线图已走完（地基、token 与排版、阅读外壳、内容原语、
Landing、交互与外围、输出格式与收尾）。三条验收全过：`--panicOnWarning` 通过、
四态输出（HTML / print / markdown / RSS）齐、32 份 locale schema 一致。

**还剩什么看 [`docs/TODO.md`](docs/TODO.md)** —— 那是「未完成事项」的唯一权威
清单。现在剩的是六条第一轮确认的视觉缺陷、五条等人看图才能判的问题，以及
两项有意推迟的（侧栏宽度拖拽、pagefind 换栈评估）。

**接手开发从 [`docs/HANDOFF.md`](docs/HANDOFF.md) 开始** —— 环境、陷阱、
验证手段都在那里，然后读 `docs/PLAN.md`（分期、验收，以及每个「不做」的理由）。

## 依赖

- Hugo Extended **0.160.1+**（开发用 0.165.0）
- Node 20+、pnpm

## 开发

```sh
pnpm install
pnpm gen:chroma      # 生成代码高亮样式表（改高亮配色时才需重跑）
pnpm dev             # CSS + TS watch + hugo server
```

## 构建

```sh
pnpm build           # css + ts + hugo
pnpm check           # 全套门禁：格式、类型、lint、单测 + 六个检查器
```

`pnpm check` 里的六个检查器各管一段契约，红了单独跑那一个：

| 命令 | 管什么 |
| --- | --- |
| `check:templates` | `{{ return }}` 没被当控制流用（Hugo 的 return 不中断执行） |
| `check:warnings` | 24 个非法输入用例确实出声 |
| `check:fallbacks` | 每条 warn 都说出它接下来做什么；禁 `errorf` |
| `check:i18n` | 32 份 locale 的 schema 完全一致 |
| `check:outputs` | 建真站点读真产物：RSS/markdown/llms 的结构与安全 |
| `check:vendor` | `VENDOR.json` 与 `NOTICES.md` 跟产物里的第三方代码对得上 |

发布前另跑一次带门的构建：

```sh
hugo --source exampleSite --themesDir ../.. --printPathWarnings --panicOnWarning
```

## 目录

```
src/css/             Tailwind 源 —— 构建输入，不是 Hugo 资源
src/css/vendor/      vendored 与生成的样式表（字体表、高亮表），勿手改
src/ts/              TypeScript 源
src/ts/entries/      esbuild 入口，每个产出一个 bundle
assets/dist/         编译产物 —— 提交进仓库，用户直接消费
static/webfonts/     随主题分发的字体，LICENSE 与字体同目录
layouts/             Hugo 模板
exampleSite/         开发与验证用站点
```

**源在 `src/`、产物在 `assets/dist/`**，这个分离是必须的：两者同名会让
`resources.Get` 拿到源文件，把 `@import "tailwindcss"` 当样式表发给浏览器
——静默失败，整站无样式。

## 约定

- **产物提交进仓库。** CSS/JS 用户 clone 后直接用，不需要为它们装 Node。
  改样式或脚本后必须重新 build 并提交产物。产物在 `.gitattributes` 里标了
  `-diff`。（**唯一例外是搜索** —— 见下方站点侧要求。）
- **模板里不拼类名。** `class="text-{{ .Param }}"` Tailwind 扫不到，样式
  会静默消失。需要动态就写完整类名分支。
- **组件样式用 `@utility` 语义类**，不在模板里堆 utility。这样 print、
  forced-colors、RTL 能集中声明，不散到每个 partial。
- **同一组件的变体用 BEM 的 `--`**（`td-pager-link--next`），不另起类名。
  `.stylelintrc.json` 的 `selector-class-pattern` 为此放开了 `--`；JSON 写
  不了注释，理由记在这里。
- **类型标尺不写在模板 class 上。** 页标题的字号字重归 `td-prose`，模板只
  给 `<h1>`。写成 `class="text-3xl font-display"` 就把标尺切成两半，改一次
  要动两个地方，而漏改的那处只在特定页型上才看得出来。
- **字体不按模板用量裁剪。** 完整分发是公开的创作面，`tests/fonts.test.ts`
  盯住表与文件的双向对应。
- **`noClasses = false` 是站点必需配置。** 否则 Chroma 输出内联样式，
  深浅色切换失效。
- **纯给 JS 读的 token** 会被 Tailwind tree-shake，需要时用 `@theme static`。

## 定制

**改外观走 `@theme`，不覆盖 Sass、不改 `assets/dist/`。**

这个主题是 clone-and-own 的：你 clone 之后 `src/css/theme.css` 就是你的文件。
颜色、字号、间距、圆角、阴影全部是那一层里的 CSS 自定义属性，改一个值重新
`pnpm css:build` 即可。

```css
/* src/css/theme.css */
@theme {
  --color-accent: oklch(0.55 0.19 250);
  --font-display: "Your Display Face", var(--font-sans);
  --td-shell-sidebar-w: 20rem;
}
```

命名分两族：Tailwind 要解析成类名的那些不带前缀（`--color-accent` 对应
`text-accent`、`--font-display` 对应 `font-display`），主题自己的布局量度带
`--td-`（`--td-shell-sidebar-w`）—— 后者只被 CSS 与 JS 直接读，不需要类名。

为什么是这一层而不是别处：

- **不改 `assets/dist/`。** 那是产物，下一次 `pnpm css:build` 会覆盖掉。
- **不用 Sass 变量覆盖那套做法。** 这里没有预处理器变量 —— token 只有 CSS
  自定义属性一层。单层的直接后果是深浅色主题、`forced-colors`、打印都用同一
  组名字：`--color-accent` 在 `[data-td-theme="dark"]` 下换一个值，所有
  引用它的组件跟着变，不必为每个组件各写一份深色规则。两层的话浅色那份在
  构建时就烧进了产物，运行时换不了。
- **纯给 JS 读的 token 别放进 `@theme`。** 那一层里没被任何类名引用的名字会被
  Tailwind tree-shake 掉，而 `getComputedStyle` 读到的是空串。要么给它一个
  真实用到的类名，要么写在普通的 `:root` 里 —— 现在的 `--td-*` 布局量度走的
  就是后者。

只加一两条覆盖时不必动 `theme.css`：在它之后 `@import` 一份自己的文件，或者
直接写一段 `:root { --color-accent: … }`。层叠顺序照常。

组件级的调整改 `src/css/<组件>.css` 里那条 `@utility`。改模板结构改
`layouts/` 下**最窄的那个 partial** —— 不要为了一个功能复制整个外壳。

## 输出格式

主题定义四种输出，**只有 HTML 默认开着**。其余三种由站点自己启用，因为每一种
都有构建代价，而代价该由决定要它的人付：

```toml
[outputs]
home = ["HTML", "LLMS", "RSS"]
section = ["HTML", "markdown", "RSS"]
page = ["HTML", "markdown"]
```

- **`markdown`**（Hugo 内建格式，出 `index.md`）—— 一页一份正文，给抓取方与
  「复制本页原文」用。产出组件标记的 shortcode 各自有纯文本形态：卡片变小标题、
  标签页摊开成小节、按键序列变行内代码、图表与录屏变一条指向源文件的链接、
  嵌套列表原样留着。出来的是 Markdown，不是剥了 CSS 的组件标记 ——
  `pnpm check:outputs` 逐条盯住这一点。
- **`LLMS`**（出 `llms.txt`）—— 全站索引，不含正文。它遍历元数据，构建代价
  基本为零，链接优先指 `markdown` 输出的地址。**只给首页开**：它是一份全站
  索引，每页各出一份完全一样的内容没有意义。
- **`RSS`** —— Hugo 内建。表格等组件有专门的 RSS 变体，输出安全的静态标记。

打印不是输出格式，是 `@media print` 的一套 CSS：chrome 全部隐藏、折叠块摊开、
`@page` 给纸张与页码。全站 38 页在 A4 内容宽下逐页量过，零溢出。

## 界面文案

`i18n/` 下 32 份 locale，schema 完全一致（97 键）。站点要覆盖某一句，在自己的
`i18n/<lang>.yaml` 里写同名键即可 —— Hugo 的站点级 i18n 优先于主题。

改动主题自己的文案时，新键必须加进全部 32 份：

```sh
pnpm i18n:sync       # 从 en 铺英文兜底，每条带 TODO(i18n) 标记
pnpm check:i18n      # schema 门禁，缺键即红
```

未翻译的键是英文原文加 `# TODO(i18n)` 标记。标记不是装饰：它把「还没翻」与
「翻好了恰好与英文同形」区分开。

## 站点侧要求

`noClasses = false` 必须写在**站点**配置里（主题级 `[markup.highlight]` 不会
合并进站点配置）：

```toml
[markup.highlight]
noClasses = false
```

搜索需要在 Hugo 之后建索引（期 5 起）：

```sh
hugo
npx pagefind --site public    # 每次部署都要
```

`hugo server` 下搜索不工作，本地预览搜索另开 `pagefind --site public --serve`。
这是本主题唯一需要站点侧装 Node 的地方 —— 选它是因为索引分块按需加载，
千页站点的搜索载荷约 100 KB，整份下载的方案要 1.4 MB。理由见
`docs/PLAN.md` §搜索选型。
