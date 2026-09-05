# 交接说明

给接手这个项目的人（或模型）。读完这一份就能继续干活，不需要翻聊天记录。

阅读顺序：**本文（环境与陷阱）→ `PLAN.md`（分期与验收）**。

## 1. 这个项目在做什么

`hugo-theme-atlas`：一个 Hugo 文档主题，用 TypeScript + Tailwind CSS 4 开发，
编译成普通 CSS/JS 交付。**clone-and-own 分发，不做 Hugo Module** —— Tailwind
靠扫描模板决定产出哪些类，消费方自己的模板扫不到，这是分发方式的前提而不是
遗漏。

范围是完整的文档主题公开面：29 shortcodes、18 render hooks、22 landing
sections、4 阅读外壳、32 locales。

判定标准是**渲染结果**：尺寸、布局、配色这些能测量的东西必须是定好的确切值，
不许「差不多」。怎么验见 §8。

### 已明确的约束

- 新仓库、新版本线，版本从 `0.1.0` 起。
- **技术决策自己定并说明理由**，不要拿前端细节问用户。只在用户必须拍板的事
  （范围、砍功能、版本线）上问。

## 2. 当前状态

**期 0–6 的路线图已走完，两轮视觉复核也走完了（期 2 的宽度拖拽有意推迟）。
没有阻塞项。**

**还剩什么看 `TODO.md`** —— 那份是权威清单。每期的完成定义、已过的验收项、
有意简化之处在 `PLAN.md` 对应小节。这三处各管一件事，别互相复制。

已交付的东西（截至 2026-09-03，下表是实测计数；数字容易过期，**不确定时以
`ls | wc -l` 为准而不是这张表**）：

| 目录 | 内容 |
|---|---|
| `src/css/` | 39 个文件：`main.css` 入口、`theme.css` token，外壳 4 份，其余按组件一份 |
| `src/css/vendor/` | `fonts.css`（18 个 @font-face）、`chroma-{light,dark}.css`（生成） |
| `src/ts/` | 25 个模块 + `entries/` 10 个 esbuild 入口 |
| `layouts/` | 155 个文件：102 个 partial、15 个 render hook（含输出变体）、30 个 shortcode，其余是 baseof、页面模板与 `all.md` / `index.llms.txt` |
| `i18n/` | 32 份 locale，每份 97 键，schema 完全一致 |
| `static/webfonts/` | `inter/` 与 `brand/` 两组，共 18 个 woff2 + LICENSE |
| `tests/` | 16 个 `*.test.ts`，103 个用例 + `tests/invalid/` 非法输入夹具 24 份 |
| `scripts/` | `build-ts` `gen-chroma` `build-icons` `gen-vendor` `check-templates` `check-warnings` `check-outputs` `check-i18n` `check-fallbacks` `make-fixture-image` |
| `assets/dist/` | 编译产物，**提交进仓库**（`.map` 除外，见 `.gitignore`） |

分支 `main`，remote `origin` 是 `ouraihub-hugo-themes/hugo-theme-atlas`。
按 `PLAN.md` 的批次表对照提交号。

## 3. 环境

已验证可用的版本：

```
Hugo Extended 0.165.0     兼容下限 0.160.1（由 floor.yml 手动验，不进 ci.yml）
Node v24.18.1
pnpm 11.21.0
Tailwind CSS 4.3.3
```

**Hugo 版本不能降到 0.160 以下**，也别停在 0.152 那种旧版：0.158 的几个
弃用在 0.165 是**硬错误**，旧版上跑不出来。已经踩过的三个：

| 旧写法 | 0.165 要求 |
|---|---|
| `languageCode` 配置键 | `locale` |
| `.Language.LanguageCode` | `.Language.Locale` |
| `.Language.LanguageDirection` | `.Language.Direction` |

本机用 scoop 管 Hugo：`scoop update hugo-extended`。升级前先杀掉
`hugo server`，否则二进制被占用会失败。

## 4. 命令

```powershell
cd <主题仓库>

pnpm install
pnpm dev          # CSS watch + TS watch + hugo server，日常开发用这个
pnpm build        # css:build + ts:build + hugo
pnpm check        # type-check + lint + vitest + check:warnings
pnpm gen:chroma   # 重新生成高亮样式表，只在改高亮配色时跑
pnpm icons:build  # 重新生成 SVG sprite，加图标后跑
pnpm check:warnings  # 单独跑非法输入夹具（tests/invalid/）
```

发布门（必须过）：

```powershell
hugo --source exampleSite --themesDir ../.. --printPathWarnings --panicOnWarning
```

`pnpm check` 和上面这条都必须 exit 0 才算一期做完。

## 5. 陷阱清单

**都是已经踩过的**，每一条都曾静默失败或浪费过时间。改代码前扫一遍。

### 5.1 静默失败（最危险，不报错）

- **源与产物同路径 → 整站无样式。** `resources.Get` 先搜 `assets/`。若
  Tailwind 源和编译产物共享相对路径，Hugo 会把 `@import "tailwindcss"`
  当样式表发给浏览器。所以源在 `src/`、产物在 `assets/dist/`，**不许合并**。
- **Tailwind 的 `@theme` 不校验变量引用。** `var(--color-typo)` 写错名字
  不报错，只是那条声明失效、静默落回继承值。期 1 就因此让代码块落回
  Chroma 自带的 github 灰。**加 token 后必须在浏览器验 computed style。**
- **`data-pagefind-body` 漏标 → 整类页面搜不到。** 该属性一旦在站点任何
  一处出现，**没有它的页面被静默排除出索引**。四个外壳 + landing 必须逐个
  标到，漏一个那类页面就整体搜不到且零报错。期 5 要写检查项覆盖这条。
- **模板里拼类名 → Tailwind 扫不到。** `class="text-{{ .Param }}"` 产出
  的类不会进 CSS。要动态就写完整类名的分支。
- **未注册的自定义属性不参与过渡 → 动画变瞬移。** 未经 `@property` 注册的
  变量计算类型是 token sequence，离散跳变。`translate: var(--x)` 配
  `transition: translate` 完全不动，且零报错。要注册类型，并把过渡挂在
  **变量本身**而不是消费它的属性上：
  ```css
  @property --td-drawer-x { syntax: "<length-percentage>"; inherits: false; initial-value: 0%; }
  transition: --td-drawer-x 250ms var(--ease-dialog);
  ```
  判据是 `el.getAnimations()` 返回空数组 —— 过渡从未注册。
- **自定义属性只向后代继承。** 把 `--td-shell-nav-h` 写在 `.td-navbar` 上，
  侧栏和 TOC 是它的**兄弟节点**，读不到，静默落回 `:root` 的值。跨兄弟共享
  的运行时几何一律定义在 `:root`。
- **同特异性下源序决定胜负。** `:dir(rtl)` 与 `[data-x]` 都是 0,2,0，加规则
  时很容易静默翻转。要么让期望胜出的那条排在后面，要么改用一个自定义属性
  承载差异，避免两条规则直接竞争。
- **字体表与文件失联** 只是字形回退，不报错。`tests/fonts.test.ts` 双向
  盯着这件事。
- **Chroma 内联样式打死深色模式。** 主题级 `[markup.highlight]` **不会**
  合并进站点配置，`noClasses = false` 必须写在**站点**配置里。这是站点侧
  的必需契约，要写进用户文档。
- **Tailwind 的层序优先于特异性 —— 这条踩了三次才定位。** `@utility` 编译进
  `utilities` 层，而 Tailwind 把 `utilities` 排在 `components` **之后**。
  所以 `prose.css` 里的每一条都赢过 `@layer components` 里的每一条，
  **无论选择器权重多高**。表现是"特异性算错了"，实际是层的问题。

  后果：凡是组件要在正文流里重排元素间距（`.td-code` 的 pre、`.steps` 的
  li 与首行），必须在 `prose.css` 那侧加 `:not()` 排除，否则组件那边写什么
  都不生效，且零报错。判据：在编译产物里查层的字节区间
  （`properties → theme → base → components → utilities`，按首次出现定序），
  看两条规则各自落在哪一层。CSSOM 走规则表在 `@layer` + `&` 嵌套下拿不到
  `selectorText`，**不要靠它排查**。
- **`@theme inline` 会摇掉没人引用的变量。** 探测 `--color-elev` 一直是空，
  以为 token 没定义；实际是当时没有任何规则引用它。加了消费方才出现。
- **Hugo 静默忽略认不出的 shortcode 参数。** 作者把 `title` 打成 `titel`
  不会有任何提示，看到的只是"我写的标题没生效"。所以每个 shortcode 都要过
  `validate-shortcode.html` 把未知参数 warn 出来。

### 5.2 Hugo 结构

- **baseof 变体是整体替换，不是继承。** `layouts/docs/baseof.html` 那种变体
  必须是完整文档（自带 doctype/head）。想复用就抽 partial，别指望模板继承。
  （我最初写成 `layouts/baseof.docs.html` 想扩展根 baseof，渲染出 1 字节
  空页。）**现仓库只有一份 `layouts/baseof.html`**，外壳差异由修饰类承载。
  加新外壳时优先走修饰类，别再开变体。
- **`static/` 里的文件不是 resource**，拿不到 fingerprint / integrity。
  需要指纹的产物放 `assets/`。字体放 `static/` 是有意的（不需要指纹）。
- **无参数 shortcode 的 `.Params` 是 nil，对它调 `isset` 的后果不一致。**
  在 `card.html` 里是一条 warn（`calling IsSet with unsupported type
  "invalid" (<nil>)`），在 `tabs.html` 里是**硬构建错误**（`isset unable to
  use key of type string as index`）。别赌哪一种，统一先兜：
  ```
  {{- $params := dict -}}
  {{- if .IsNamedParams }}{{ $params = .Params }}{{ end -}}
  ```
- **嵌套 shortcode 的 `.Position` 永远是 `file:1:1`。** 它相对的是父级
  `.Inner` 那份独立文档，不是源文件。更糟的是 **Hugo 的日志会去重字节完全
  相同的警告**，所以两个同样的嵌套错误会塌成一条，看着像只错了一个。
  警告里必须带 `.Parent.Position` 加序号：
  ```
  {{- with .Parent }}{{ $at = printf "%s, card #%d" .Position (add $.Ordinal 1) }}{{ end -}}
  ```
- **shortcode body 是独立的 Goldmark 文档**，render hook 的 `.Ordinal` 从 0
  重数 —— 页面上的第一个围栏和卡片里的第一个围栏都算出 `code-0`，id 撞车。
  作用域前缀由 `content/render-block.html` 在渲染前写进 Page Store。
- **`<details>` 的 `open` 是服务端每页重算的**。任何持久化都必须是**加性**
  的（只恢复"打开"），否则读者正在读的 section 会在导航后自己收起来。
  见 `src/ts/sidebar-nav.ts` 的头注释。

### 5.3 工具链

- **stylelint 不认识 `@utility` 建立作用域** → 已在 `.stylelintrc.json` 里
  按文件加了 override。新增写 `@utility` 的文件要加进那个 files 列表。
- **`no-duplicate-selectors`**：`:root` 只能出现一次，分组靠注释分隔。
  且 `custom-property-empty-line-before` 要求空行前必须有注释 —— 光加空行
  会被 `--fix` 抹掉。
- **`no-descending-specificity`**：更具体的选择器要排在更宽的后面。
- **pnpm 默认拦 postinstall**（esbuild、@parcel/watcher）。`approve-builds`
  是交互式的，用不了；已在 `pnpm-workspace.yaml` 的 `allowBuilds` 里放行。
- **加依赖前先确认版本真实存在。** 我编过 `jsdom@28.0.1`、
  `typescript@5.9.4`，都不存在。另外 typescript-eslint 8.68 的 peer 是
  `<6.1.0`，所以留在 TS 5 是必需，不是保守。
- **`execFileSync` 只返回 stdout，而 Hugo 把警告写 stderr 且退出码 0。**
  照它写检查器会读到零条警告、全部断言失败，看着像模板没生效。用
  `spawnSync` 把两个流拼起来：
  ```js
  const r = spawnSync("hugo", args, { encoding: "utf8" });
  return { ok: r.status === 0, text: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  ```
- **`noUncheckedIndexedAccess` 已开**，`arr[i]` 的类型带 `undefined`。即使
  上一行的纯函数已保证下标在界内，编译器也看不到 —— 在调用点收窄，别用
  `!` 断言掩过去。
- **非法输入夹具不能放 `exampleSite/`**，否则发布门 `--panicOnWarning` 会红。
  放 `tests/invalid/`，由 `scripts/check-warnings.js` 在临时站点里构建。
  夹具还必须落到 `content/docs/` 下 —— 根级 `content/*.md` 没有匹配的单页
  模板，Hugo 会渲染 0 个 shortcode 而**不报错**。

### 5.4 本机环境

- 用 **PowerShell 工具**（pwsh 7.6.5），不用 `powershell.exe`（那是 5.1）。
- 系统 ACP 是 936，命令输出**含中文时**开头加
  `[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); `，否则乱码。
- `-ErrorAction SilentlyContinue` 只压错误输出，退出码仍非零；真要忽略用
  `try { ... -ErrorAction Stop } catch {}`。
- **Playwright 截图有时读回来是空的。** 主要手段是 `browser_evaluate` 读
  computed style —— 那是更硬的证据。但截图**能**读时是有用的：期 3 靠逐像素
  取色确认了 steps 竖线被 marker 的 box-shadow 切开的间隙（marker 0–34、
  空 36–41、线 42–45、空 46–51）。
- **Playwright 会往当前工作树里写。** 每次导航写 `.playwright-mcp/`，截图也
  默认落那儿。每轮浏览器验证后清掉，别让它进提交。
- **要在只读的目录上起站时，`--renderToMemory` 不够。** 它挡的是渲染产物
  （`public/`），挡不住 `resources/_gen/` —— 那归 `resourceDir` 管，**没有对应
  的 CLI 开关**，`--cacheDir` 也不管它，只能用 `HUGO_RESOURCEDIR` 环境变量指
  到临时目录。而 `resources/` 通常在 `.gitignore` 里，所以 `git status` 一直
  干净，写进去了也看不出来。

### 5.5 浏览器验证的八个坑（期 2 起陆续踩到）

这几条都是"代码没问题，验证方法有问题"，排查顺序不对会在正确的代码上
浪费很多时间。

1. **断言过渡终值要 `await Animation.finished`**，不要 `setTimeout` 采样。
   无头环境不稳定产帧，定时器读到的可能是过渡起始值。
   ```js
   await Promise.all(el.getAnimations().map(a => a.finished.catch(() => {})));
   ```
   要把 CSS 逻辑与产帧问题干净隔离，临时 `el.style.transition = 'none'`
   再读计算值 —— 无插值，计算值即目标值。

   **切主题也会触发过渡，这一条比交互更容易漏。** 改 `data-td-theme` 之后同步
   读 `getComputedStyle` 拿到的是起始值，因为令牌变了而 `background-color` /
   `filter` 上挂着 150ms 过渡。期 6 在这上面栽了两次：读 logo 滤镜得到
   `grayscale(0.967)`、读按钮背景得到亮色的 `(36,95,148)` 而令牌明明已经是
   `#7db3e0` —— 两次都不是任何一个静止态，而它们看起来都像"改动没生效"。
   判据：等关注元素的目标属性**连续 8–10 帧不变**再读。

2. **`hugo server` 会送旧 CSS。** 改了 `src/css/` 并 `pnpm css:build` 后，
   dev server 可能仍返回上一份产物。判据：抓 `/dist/main.css` 比对磁盘长度。
   不一致就**重启 server**，别怀疑 CSS。
3. **`scrollIntoView` 会被滚动上限钳制。** 末屏内的标题永远滚不到视口顶部，
   `scrollY` 停在 `scrollHeight - innerHeight` 不再变。排查 scroll 相关行为
   **先确认 `scrollY` 真的在变**，再看几何，最后才怀疑判定逻辑。夹具页面
   必须长到末节能越线。
4. **同一页面反复 `browser_evaluate` 会累积状态**（监听器、滚动位置、
   `localStorage`、DOM 属性）。测状态机要么每轮重新导航，要么在脚本开头
   显式复位。前一轮的残留会让读数看着像缺陷。
5. **`localStorage` 按源隔离，`localhost` 与 `127.0.0.1` 是两个源。**
   验持久化时中途换写法，会看到"存进去的值读不出来"，像是运行时坏了。
   **一轮验证里只用一个源。**
6. **过渡中途采样会读到起始值。** 两个 `requestAnimationFrame` 不够覆盖
   150ms 的过渡 —— 期 3 因此以为复制按钮的颜色没跟主题走，等 250ms 再读
   就对了。首选 `await Animation.finished`（见上面第 1 条）。
7. **`emulateMedia({ colorScheme })` 切不了这套主题。** 深浅色走
   `[data-td-theme="dark"]`（`theme.css:144`），不是 `prefers-color-scheme`。
   用 colorScheme 模拟只会让 `bodyBg` 停在亮色的 `rgb(241,244,248)`，看起来像
   暗色令牌没写对。要改属性。`forcedColors` 与 `media: 'print'` 那两个模拟是
   真的有效。
8. **oklch 颜色不能用正则取数。** `getComputedStyle` 对
   `oklch(0.42 0.06 250 / 0.14)` 原样返回，`match(/[\d.]+/g)` 会把亮度 `0.42`
   当成 r 通道，算出来的对比度是废数（期 6 量分界线得到 1.34，实际 1.25）。
   用 canvas 解析，先填底色再填前景色，读回来就是合成后的 sRGB —— 半透明边框
   的实际观感要这样才量得到：
   ```js
   ctx.fillStyle = bgColor; ctx.fillRect(0, 0, 1, 1);
   ctx.fillStyle = fgColor; ctx.fillRect(0, 0, 1, 1);
   const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
   ```

- **`localhost` 可能解析到 IPv6，而 `hugo server` 只绑 127.0.0.1。**
  PowerShell 里用 `http://127.0.0.1:1313`；Playwright 用 `localhost` 正常。
  同理，`Invoke-WebRequest` 打 `localhost` 失败**不代表 server 没起来** ——
  换 `127.0.0.1` 再判一次，别急着重启（端口被占会让重启也失败，读起来像
  另一个问题）。
- **PowerShell 没有 heredoc。** 提交信息用 `git commit -F` 读文件，先把
  信息写进 `.git/COMMIT_MSG_TMP`（用 Write 工具，不用 `echo` 重定向）。
  信息里出现 `/#` 这类片段会被 PowerShell 的路径保护判成危险路径，整条命令
  被拦 —— 遇到就改用 Write 工具写文件，或者换个词。
- **陈旧 CSS 也可能在"已经打开的那个页面"里，而不在响应里。** 期 2 的 5.4
  第 2 条说抓 `/dist/main.css` 比对磁盘长度 —— 那**检测不到这一种**：长度
  一致（都是新文件），CSSOM 遍历在 `@layer` 下也不可靠，但页面用的仍是旧表。
  判据是 `fetch(url, {cache:'reload'})` 证明文件本身没问题，然后**重新导航
  一次**（带 `?v=2` 之类的破缓存查询串）读数就对了。
  症状是"新加的规则计算值全是初始值"，看起来像 CSS 没生效。

### 5.6 Hugo 模板的三个硬错

这三条都是"模板写法本身不合法"，不是逻辑错 —— 构建直接停，且报错信息离
真正原因有点距离。

1. **`.page | default .` 行不通。** 对 `page.Page` 取不存在的字段是硬错，
   `default` 轮不到执行。partial 必须认定一种调用约定：要么收 Page 本身，
   要么收 dict，不能两者兼容。
2. **一个 shortcode 在一页里只能用一种调用形式。** 模板里读了
   `.Inner`/`.InnerDeindent` 的 shortcode，**每次调用**都必须成对或自闭合
   （`{{< fig ... />}}`），混用报 "must be closed or self-closed"。反过来，
   不读 Inner 的 shortcode **不能**自闭合，报 "does not evaluate .Inner,
   yet a closing tag was provided"。
   顺带：`{{< kbd / >}}` 里那个裸 `/` 会被当成闭合标签，要写 `"/"`。
3. **`i18n` 查不到的键返回空串，不返回键名。** 所以"回退到 kind 本身"这类
   兜底是假的 —— 写了也只会输出空。对内部值（不是作者输入）干脆不加校验分支。

## 6. token 与设计意图

**每个非显然的值，注释要写它为什么是这个值**，否则下一个人会「优化」掉它。
已经在库里的几个例子：

- 代码墨色是绛红而不是蓝 —— 一页密集标识符该读作「代码与正文」，而不是
  「代码与链接」。用蓝色会让读者以为每个标识符都能点。
- `.lead` 不用 300 字重 —— Inter 和 CJK 字体在这个字重下都会发虚。
- 标题字族是 Inter 而非 Chakra Petch，后者只用在品牌位（见 `PLAN.md` 期 1）。

两条仍然生效的坑：

- **警惕上游默认值。** `pnpm gen:chroma` 生成的高亮表自带 github 的
  `#f7f7f7` / `#0d1117` 背景，主题用 `--td-pre-bg` 覆盖成 `#fff` / `#0a0f16`。
  重跑生成器后要确认覆盖还在。
- **顺着变量链查到底。** 一个 token 看着指向某个字族，中间可能有一层解析成了
  别的值。改 token 前把它的实际计算值读出来（`browser_evaluate` 读 computed
  style），不要只看声明。

## 7. 本项目的约定

写代码时守这些，`README.md` 里有面向用户的版本。

- **类型标尺不写在模板 class 上。** 页标题的字号字重归 `td-prose`，模板
  只给 `<h1>`。写成 `class="text-3xl font-display"` 就把标尺切成两半，改
  一次要动两个地方，而漏改的那处只在特定页型上才看得出来。
- **组件样式用 `@utility` 语义类**，不在模板里堆 utility。这样 print、
  forced-colors、RTL 能集中声明，不散到每个 partial。
- **调色板在普通 `:root` / `[data-*]`，`@theme inline` 只做映射。** 这是
  Tailwind 4 做运行时主题切换的标准写法。写进 `@theme` 的值编译期固化，
  切不动。
- **纯给 JS 读的 token 会被 tree-shake**，需要时用 `@theme static`。
- **无效输入 warn + 有文档的回退**，禁止 `errorf`。`hugo server` 必须还能
  用，发布门靠 `--panicOnWarning` 拦。参考
  `layouts/_partials/typography-preset.html`。
- **`warnidf` 而非 `warnf`**：同一个错值在几百页上只报一次。
- **字体和 Font Awesome 不按模板用量裁剪**，完整分发是公开创作面。
- **产物提交进仓库**，用户 clone 后不装 Node 直接用。改源码后必须重新
  build 并提交产物；产物在 `.gitattributes` 里标了 `-diff`。
- **CSS 用逻辑属性**（`margin-block`、`padding-inline-start`、
  `border-inline-start`）。本表编译一次，不过 rtlcss，RTL 全靠逻辑属性。
- **非平凡逻辑留一个能跑的检查**，并且**验证过它会失败**。不会失败的检查
  不算检查。

## 8. 每期怎么验

四项一期不欠，欠一期就永远补不上（`PLAN.md` 铁律 2）。

**测量**：`browser_evaluate` 读 computed style，逐项对照 `PLAN.md` 里记的
目标值。这是主要手段，比截图硬。

```js
// 模板：拿到元素读你关心的属性，和源码取的值逐项比
() => {
  const cs = (el, p) => getComputedStyle(el).getPropertyValue(p);
  const h = document.querySelector('.td-prose h2');
  return { size: cs(h,'font-size'), weight: cs(h,'font-weight'), mt: cs(h,'margin-top') };
}
```

**深浅色**：`document.documentElement.setAttribute('data-td-theme','dark')`
后重测。

**RTL**：`setAttribute('dir','rtl')`，确认 `border-inline-start` 之类真的
翻面（读 `border-left-width` / `border-right-width` 两侧）。

**print / forced-colors**：媒体查询下的 computed style 读不到，改为在编译
产物里确认规则存在（`Select-String` 查 `@media print`、`CanvasText` 等）。

**reduced-motion**：确认三个 duration token 被归零。归零 token 而不是维护一份
逐选择器的名单 —— 名单会漏，而新加的动效默认就该跟着 token 走。

## 9. 公开面已经齐了

实测计数（2026-09-03）：

| | 数量 |
|---|---|
| shortcodes | 30 |
| render hooks | 15 |
| landing sections | 22/22 |
| locales | 32/32 |
| 阅读外壳 | 4 |

shortcode 与 hook 的数字跟早先的目标数（29 / 18）对不上，**两侧都是实测数**。
hook 那一侧的差是有据的：目标数把每个输出变体各算了一份，而若干变体判过之后
不做（`render-table.print` 没有可挂的输出格式，理由在 `PLAN.md`）—— 现在
`_markup/` 下是 15 个 `.html` 加 1 个 `render-table.rss.xml`。shortcode 多出的
一个没去追是哪一个，目标数本身是早期估的。**核对以 `ls` 为准，不以这张表为准。**

**关于工作量估算**：期 0/1 的实际成本超出估算，主要花在「发现并绕开静默失败」
上（Hugo 版本硬错误、Chroma 配置、token 引用不校验），不是写代码。这个判断在
期 3 得到确认：Tailwind 层序、嵌套 `.Position`、nil `.Params` 三条各自吃掉了
可观时间，写代码本身都是几分钟。**估工作量要按「有几处静默失败要踩」算，不是
按行数算。** 期 6 又验了一次：这一期的时间几乎全花在三处静默陷阱上 ——
`.md` 模板不转义而 `.html` 模板转义、管一次 `.Inner` 就把 HTML 类型剥掉、
Store 是页级而格式渲染顺序不保证。

路线图走完，`PLAN.md` §工作量重估不再有「剩余」一栏可填。

## 10. 已定的四项

1. 仓库 `hugo-theme-atlas`，版本从 `0.1.0` 起。
2. 搜索用 **pagefind**，消费方多一步构建（理由见 `PLAN.md` §搜索选型 ——
   决定性因素是索引载荷差一个量级）。
3. 另起文档站，等主题开发完再做。
4. clone-and-own 分发，不做 Hugo Module。

**没有阻塞项了**（2026-09-03）。中间有过五条视觉判断卡在「这一侧读 PNG 只能
拿到一个 `.` 字符」上，两轮复核都由看得见图的一方给结论、这一侧拿文字结论改
代码，现已走完 —— 结果在 `VISUAL-REVIEW-FINDINGS.md` 与
`VISUAL-REVIEW-ROUND2-RESULT.md`。

**这件事会再遇到，所以记下怎么交接**：任务书里第一件事要求对方**自证能看图** ——
让他读一张已知内容的 PNG 并说出图里有什么。这一侧的失败模式是静默的（返回单个
`.`，不报错），如果对方也这样，整轮白做而且看不出来。第二轮的自证是让对方描述
一张四方案对照图，他报出的顺序是夹具里四项的顺序而不是三档的顺序 —— 那个顺序
猜不出来，所以是真看见了。

**验收对方的报告要核可核的部分，不要照单收下。** 第二轮报告说「临时 fixture 已
回退」，实际只回退了三行里的一行（`tone` 回了，`title` 与 `subtitle` 还在说
「这一节故意放在 plain 档」）—— 渲染是 muted 而文案讲 plain，比不回退更容易误导
下一个人。判据是拿 `git diff <改夹具那次提交>~1` 比，而不是看某一行。
