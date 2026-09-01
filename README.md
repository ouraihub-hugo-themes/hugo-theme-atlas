# hugo-theme-atlas

Hugo 文档主题。TypeScript + Tailwind CSS 4，编译为普通 CSS/JS。

语义优先的 HTML，渐进增强；组件样式集中声明，覆盖 print、RTL、forced-colors、
reduced-motion 与窄屏。

## 状态

开发中。期 0（地基）、期 1（token 与排版）、期 2（阅读外壳）已完成并验证，
期 3（组件面）进行中。

**接手开发从 [`docs/HANDOFF.md`](docs/HANDOFF.md) 开始** —— 环境、陷阱、
验证手段都在那里，然后读 `docs/PLAN.md`（分期与验收）。

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
pnpm check           # type-check + lint + test
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
