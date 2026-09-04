# Agent Skill 规划

给「让 AI 用这套主题搭站」的用户做一份 Claude Code skill。

**状态：只有规划，一行代码没写。** 动笔前有一批必须先验的事，清单在 §10。

这份文档的作用是**让工作不依赖聊天上下文** —— 机器宕机、上下文丢了，读它就能接着
干。所以：§0 讲在做什么、解决什么问题、怎么实现；后面每条实测结论都附**判据**
（怎么测出来的），重看一遍不用重跑；推断一律标出来，不要当事实用。

急着接手就读 §0 和 §11，其余按需查。

## 0. 问题与方案（先读这一节）

**问题。** 现在想用这套主题搭站，只有一条路：读 `exampleSite/` 的源码。示例站把
30 个 shortcode 的**渲染结果**摆得很全，但没有一处教「配置怎么写」「md 怎么写」。
用户原话：

> 现在我看到的是，如果想学习如何做一个你这样的网站，用我们的组件，需要看你示例
> 网站的源码。

对人来说这是不方便；对模型来说这是**会静默出错**。三类错误已经识别出来：

1. **参数名打错不报错。** Hugo 静默忽略认不出的 shortcode 参数（`HANDOFF.md`
   §5.1 末条）。模型把 `title` 写成 `titel`，构建绿、页面上标题没了。
2. **调用形式混用是硬错。** 读 `.Inner` 的 shortcode 每次调用都必须成对或自闭合，
   混用直接构建失败（`HANDOFF.md` §5.6 第 2 条）。哪些读 `.Inner` 只能看模板。
3. **站点侧有五条必需配置，主题没法帮它设默认**（§8）。少任何一条都是构建成功、
   功能悄悄不对。

**方案。** 一份 Claude Code skill：`.claude/skills/hugo-theme-atlas/`。模型在
相关任务时自动加载，拿到的是「读了源码也照样会错的那些事」+ 机器生成的参数表。

**为什么是 skill 而不是补文档页。** 补文档页要在页面上同时给源码和渲染结果，而
§5.1 实测证明这做不到（`.Inner` 已渲染）；退而拆 fixture 文件的话，12 个页面要
拆出约 90 个文件。skill 这条路的参数表**能从模板生成**，成本低一个量级且不漂移。
两条路不互斥，skill 先做。

**怎么实现（三步，细节见 §6–§9）。**

1. 写生成器从 155 个模板里抽参数白名单、调用形式、枚举值 → `shortcodes.md`，
   配 `--check` 门禁（模板改了但表没重生成就红）。
2. 手写 `config.md`（五条必需配置）与 `commands.md`（命令 + 顺序依赖 + 不存在的
   东西），这两份是勘误性质的，抽不出来。
3. 写 `SKILL.md` 做导航（500 行以内），配 `evals.json` 验收。

## 1. 目标与受众（已定）

受众是**通过 AI 搭站的用户**，不是主题开发者，也不是自己读源码的开发者。

判断依据：用户原话「我让你写 skills 就是给那些通过 ai 来用我们的主题组件搭建
网站的用户」。

所以 skill 里不放：样式定制（那是改 `theme.css`，属主题开发）、九个检查器、
产物构建流程。这些是主题开发者的事。

## 2. 参照对象的实际分工

参照 `shadcn-svelte` 的 skill 与它的官网。**八个文件全部读过**（`SKILL.md`、
`cli.md`、`customization.md`、`rules/{styling,forms,composition,icons}.md`、
`agents/openai.yml`、`evals.json`），官网读了 `/docs/components`、
`/docs/components/badge.md`、`/docs/cli`。

**关键发现：skill 不复述组件 API。** `badge.md` 那个端点没有 props 表，variant
只能从示例里隐式看出。`SKILL.md` 对应的是一句话：

> Open `https://shadcn-svelte.com/docs/components/<name>.md` for docs and
> examples. **When creating, fixing, debugging, or using a component, read the
> official page first.**

分工是：**文档站给事实，skill 给「读了文档也照样会错的那些事」。** skill 是勘误
表，不是文档副本。

**第二个关键发现：那句「不要编参数」是写 skill 的人加的，官方文档里没有。**
`/docs/cli` 页面完全没有面向 AI 的内容，只有四段 `--help` dump。而 `cli.md` 里
写着：

> **IMPORTANT:** Only use the flags documented below. Do not invent or guess
> flags — if a flag isn't listed here, it doesn't exist. The CLI auto-detects
> the package manager; there is no `--package-manager` flag.

点名了一个模型最常编的参数。这是 skill 相对文档的真实增量。

`SKILL.md` 的实际结构（我第一次描述错了，以为主体是规则清单）：Current Project
Context → Imports → Principles → Critical Rules（一行一条 + 链接）→ Key
Patterns（一整块可复制代码）→ Component Selection（需求→组件的表）→ Key
Fields → Workflow → Updating。规则清单只是其中一节。

规则文件的格式：每条是 `**Incorrect:**` 代码块 + `**Correct:**` 代码块，两块都
**完整可编译**（连 import 都写全）。文件开头有 `## Contents` 列本文件所有条目。
一句话说得清的条目不放代码（如 `size-*` 那条）。

## 3. 官方 spec 的三条硬约束

来源：`https://code.claude.com/docs/en/skills`（原 `docs.claude.com` 那个 URL
301 到这里）。

1. **`SKILL.md` 要 500 行以内**，细节移到附属文件按需加载。原来 shadcn 那种
   `rules/*.md` 结构不是风格选择，是规范要求。
2. **body 一旦加载就在后续每一轮都占 context** —— 官方原话「every line is a
   recurring token cost」。所以参数表**不能**放 `SKILL.md`，必须放附属文件，
   模型要用某个组件时才读那一份。
3. **`user-invocable: false`** 用于「背景知识」类 skill：不是给人敲 `/xxx` 的
   命令，是模型该在相关时自己加载的。shadcn 那份就是这么设的。

其余：所有 frontmatter 字段都可选，只 `description` 推荐（Claude 靠它判断何时
加载，与 `when_to_use` 合并后在清单里截到 1536 字符）。附属文件要在 `SKILL.md`
里被引用，Claude 才知道每份装什么、何时读。

## 4. 目录与语言（已定）

**源码位置：`skills/hugo-theme-atlas/`（仓库根下的普通目录）。**
**安装位置：消费方站点的 `.claude/skills/hugo-theme-atlas/`。**

两者是不同的东西，别混。`.claude/skills/` 是**装好之后**的位置，属于消费方的树；
我们这里是源码，跟 `src/`、`layouts/`、`scripts/` 同级，由生成器写入、由 `--check`
门禁看着、跟着版本走。

把源码放进主题仓库自己的 `.claude/skills/` 有两个具体坏处：

1. **受众错位。** 那样它会在每次**主题开发**会话里自动加载，而它是写给**站点搭建
   者**的。主题开发者不需要「怎么调用 badge」，需要的是 `HANDOFF.md`。
2. **白付 context。** 官方 spec 说 body 一旦加载就在后续每轮都占 token（§3 第 2
   条）。装在错的仓库里就是每轮为一份用不上的文档付费。

安装方式写进 `README.md`：把 `skills/hugo-theme-atlas/` 拷进自己站点的
`.claude/skills/`。clone-and-own 分发下用户手里本来就有这个仓库，一次拷贝的事。

不放 `.agents/skills/`（参照项目那份的位置）—— 那是 OpenAI 的约定。要跨工具以后
加一份 manifest 即可，内容不动。

**语言：英文。** 公开面（`cards`/`card`、`image_alt`、`params.ui.share`）本来
就是英文，中文散文里嵌一堆英文标识符别扭；以后加跨工具 manifest 省一次翻译。
代价是跟仓库其余中文文档不一致，已接受。

## 5. 实测出来的三条限制

**这三条是这轮讨论最贵的部分，重建要重跑构建与探针。**

### 5.1 `.Inner` 拿到的是已渲染的 HTML

想做「一次书写、两处呈现」（同一段源码既显示成代码又真渲染）的话，第一直觉是
写个 `demo` shortcode 把 body 渲染两遍。**做不到。** Hugo 由内向外展开：

```
{{< probe >}}{{< badge text="hi" tone="info" >}}{{< /probe >}}
→ .Inner = "<span class=\"td-badge td-badge--info\">hi</span>"
```

判据：临时加 `layouts/_shortcodes/zzprobe.html` 输出 `printf "%q" .Inner`，建站
看渲染结果。探针已删。

后果：要在页面上同时给源码和效果，只有两条路 —— 作者把源码抄一遍（179 处调用，
会漂移），或每个例子拆成独立 fixture 文件用 `include` 引两次
（`{{< include file="ex.md" code=true >}}` 加 `{{< include file="ex.md" >}}`，
第二条已经能用，但 12 个页面要拆出约 90 个文件）。

### 5.2 主题的 markdown 输出把组件降级成纯文本

`exampleSite` 每页都出 `index.md`（`[outputs] page = ["HTML", "markdown"]`），
所以形式上有 shadcn 那种 `.md` 端点。**但内容喂不了 skill。**

`docs/components/card/index.md` 实际内容：

```
## 只有标题
描述是可选的。
#### 第一步
#### 第二步
```

原文是 `{{< cards >}}{{< card title="第一步" >}}{{< /card >}}`。卡片变成了小标题。

判据：`hugo --source exampleSite --themesDir ../..` 之后读
`exampleSite/public/docs/components/card/index.md`。

这对那个输出格式是**正确的**（它服务抓取方与「复制本页原文」，契约就是不含组件
标记）。但意味着不能照搬 shadcn 的分工：他们的 `.md` 能带源码，因为文档页正文
本来就是代码围栏；我们的文档页正文是活的组件。

### 5.3 参照对象有公开文档站，这套主题没有

`TODO.md` 里「另起文档站」那条挂着「等有外部消费方再拆」，条件未满足。

所以「skill 指向权威文档」这个模式缺一环。三条补法：

| | 做法 | 代价 |
|---|---|---|
| 1 | skill 自带参数表（生成 + `--check` 门禁） | 违背 shadcn 的分工，但不依赖文档站；表能生成所以不漂移 |
| 2 | 先建文档站，页面用代码围栏写源码 | 成本最高，且要先解决 5.1 |
| 3 | skill 指向 GitHub 上的 `exampleSite/content/**.md` 原文 | 近乎零成本；但要求模型能联网或本地有 clone |

**当前选 1**，理由是参数白名单在模板里机器可读（见 §7），生成 + 门禁之后表与
实现不可能漂移，成本比文档站低一个量级。3 可以作为 1 的补充写进 SKILL.md
（「要看完整例子读 `exampleSite/content/docs/components/<name>.md`」）。

## 6. 交付物：五个文件

```
skills/hugo-theme-atlas/
  SKILL.md        导航 + 最小可用配置 + 组件清单（500 行以内）
  config.md       站点侧五条必需配置（每条都是静默失败）
  commands.md     建站命令、顺序依赖、不存在的东西
  shortcodes.md   30 个 shortcode 的参数/调用形式/枚举（生成，带门禁）
  evals.json      验收 prompt
```

**顺序有讲究：`commands.md` 排在 `shortcodes.md` 前面。** 模型得先让站点跑起来
才谈得上写组件；反过来会得到一堆语法正确但站点起不来的产物。

各文件的职责边界：

| 文件 | 装什么 | 怎么来 | 为什么不能合并 |
|---|---|---|---|
| `SKILL.md` | 何时读哪一份、最小配置、组件清单表 | 手写 | 每轮都占 context，只放导航 |
| `config.md` | 五条必需配置 + 每条的失败表现 | 从 `exampleSite/hugo.toml` 注释提炼 | 只在配置站点时读 |
| `commands.md` | install/dev/build/pagefind + 顺序 | 从 `package.json` 提炼 | 只在建站或调构建时读 |
| `shortcodes.md` | 参数白名单、调用形式、枚举值 | **生成** | 最大的一份，只在写某组件时读 |
| `evals.json` | 验收 | 手写 | 不是给模型读的 |

**`SKILL.md` 里的组件清单是「需求 → 组件」的表，不是参数表。** 这一条抄参照项目
的 Component Selection（§2 里认定它是最可迁移的部分）：模型的第一个决策是「该用
哪个组件」，而不是「这个组件有哪些参数」。参数表在 `shortcodes.md`，按需读。

**明确不做的两类内容，各有理由：**

- **样式定制规则**（参照项目 `rules/styling.md` 那种）。这套主题的样式面是
  `theme.css` 的 token，改它属主题开发，不属搭站（§1）。
- **组件选型哲学**（「什么时候该用卡片而不是列表」）。这是设计判断，写进 skill
  会变成没有判据的规训，而 skill 的价值在于**可验证的事实**（§2：勘误表）。

## 7. 生成器：四类机器可读的事实

**这是整个方案的支点。** 参数表能生成，所以它不会漂移；不能生成的部分（`config.md`
`commands.md`）体量小到可以手写维护。

`layouts/_shortcodes/` 下 30 个模板，每个都调了 `validate-shortcode.html` 声明自己
的公开面 —— 因为它要靠这个 warn 未知参数（`HANDOFF.md` §5.1 末条）。实际签名
（已核对 `badge.html:9`）：

```
{{- partial "validate-shortcode.html" (dict "shortcode" . "at" $at
  "allowed" (slice "text" "tone" "link" "icon")) -}}
```

**30 个不是同一种形态，这一点先前我搞错了。** 实测分布：

| 形态 | 个数 | 特征 |
|---|---|---|
| 具名参数，模板里直接写 `allowed` | 21 | 主流 |
| 具名参数，`allowed` 在被委托的 partial 里 | 2 | `redoc` / `swagger` 都转给 `content/openapi-embed.html:15`（`spec` `height` `id`） |
| `"form" "positional"` | 3 | `kbd` `param` `download`，无 `allowed` |
| `"form" "none"` | 4 | `cards` `steps` `comment` `release-card`，不收参数 |

判据：`grep -l '"allowed"' layouts/_shortcodes/*.html` 得 21；逐个看剩下 9 个的
`validate-shortcode` 调用。

后果有两条：

1. **门禁的判据不是「30 个都抽到 `allowed`」，是「30 个都归到某一类」。** 抽不到
   `allowed` 且没有 `form` 声明的才是漏抽，那种必须非零退出。
2. **位置参数的语义抽不出来。** `{{< kbd "Ctrl" >}}` 里那个参数是什么，只写在模板
   的文档注释里。这 3 个要手写补，并在生成的表里标出来源是手写 —— 否则下一个人会
   以为整张表都是生成的，改模板时不会想到还有手写部分要跟。

四类可抽的事实：

| 事实 | 抽法 | 用途 |
|---|---|---|
| 参数白名单 | `validate-shortcode.html` 调用里的 `"allowed" (slice …)` | 参数表主体；防打错名 |
| 调用形式 | 同一调用里的 `"form"` 键：`named`（默认）/ `none` / `positional` | 防写成 `{{< kbd "x" >}}` 而它要 `key="x"` |
| 成对还是自闭合 | 模板里是否出现 `.Inner` / `.InnerDeindent` | 防混用（那是硬错，§0 问题 2） |
| 枚举取值 | `validate-enum` 调用的取值列表 | `tone="infoo"` 这类值错。**但 shortcode 里只有 1 处**（§10.1 第 2 项），收益远小于预期 |

**`--check` 门禁怎么做**（照 `scripts/check-i18n.js` 的模式）：重新生成到内存，
与磁盘上的 `shortcodes.md` 比对，不一致就非零退出并打印 diff。挂进 `pnpm check`。

两条已知的实现约束，都是这个仓库里踩过的：

- **门禁要自己规范化行尾。** `--check` 比较前把两侧统一成 LF，否则在 CRLF 机器上
  永远红（这条在别处已经吃过一次）。
- **生成器读的是模板文本，不是 Hugo 运行时。** 所以它对 `allowed` 的写法敏感：
  一旦有模板把 slice 拆成多行或用变量拼，抽取会漏。**生成器必须在漏抽时报错而不是
  静默产出短表** —— 30 个模板全都要抽到，抽到 29 个就退出非零。这是「不会失败的
  检查不算检查」（`HANDOFF.md` §7 末条）在这里的具体形式。

## 8. `config.md`：站点侧五条必需配置

**这五条主题都设不了默认，因为 Hugo 忽略主题设置的 `markup`。** 每一条漏掉都是
构建成功、功能悄悄不对 —— 这正是模型最容易交付「看着对」的地方。

已从 `exampleSite/hugo.toml` 逐条核对（行号为当前值）：

| 配置 | 位置 | 漏掉的表现 |
|---|---|---|
| `noClasses = false` | `[markup.highlight]` :124 | Chroma 输出内联样式，浅色页面里出现深色代码块，深浅切换失效 |
| `unsafe = true` | `[markup.goldmark.renderer]` :97 | 组件产出的 HTML 被转义成文本 |
| `wrapStandAloneImageWithinParagraph = false` | `[markup.goldmark.parser]` :102 | 图被包在 `<p>` 里，`.IsBlock` 恒假，figure 与尺寸覆盖全部不生效 |
| `block = true` | `[markup.goldmark.parser.attribute]` :107 | `{class="x"}` 那一行当普通文本渲染出来 |
| passthrough + 定界符 | `[markup.goldmark.extensions.passthrough]` :115–120 | 行内公式不渲染（` ```math ` 围栏不受影响，那条路不经过 passthrough） |

`config.md` 的写法照参照项目的 Incorrect/Correct：给**完整可粘贴的 TOML 块**，
不是散装键名。理由同 §2 —— 半截配置模型会拼错层级，而 TOML 的层级错了不报错。

来源是 `exampleSite/hugo.toml` 的注释，它本来就写清了每条的必要性（上面那张表的
「表现」一列就是从注释里来的）。所以这份是**翻译 + 提炼，不是重新论证**。

## 9. `commands.md`：命令面

### 9.1 一个必须先纠正的事实

`package.json` 里的 `dev` 与 `build` **不是给站点搭建者的**：

```
dev   = concurrently … "hugo server --source exampleSite --themesDir ../.."
build = pnpm css:build && pnpm ts:build && hugo --source exampleSite --themesDir ../..
```

两条都硬编码了 `--source exampleSite --themesDir ../..`，也就是**只能构建这个仓库
自己的示例站**。搭建者在自己的站点里跑不到它们（连 `package.json` 都不在手上 ——
clone-and-own 分发下他拿的是 `themes/` 里的一份主题）。

**所以 `commands.md` 的主体不是 `pnpm` 脚本，是普通 `hugo` 命令。** 这一条如果不
纠正，会写出一份「看着对但用户照做跑不起来」的命令清单 —— 这正是我先前标为必须
先验的那项。已验证，结论就是这个。

顺带：`install` 脚本不存在，`pnpm install` 是包管理器内建命令。写「运行
`pnpm install`」没错，但不能写成「运行 `pnpm run install`」。

### 9.2 要写进去的内容

- **建站与预览**：在自己的站点里 `hugo server`；主题放 `themes/hugo-theme-atlas/`。
- **产物已提交，消费方不需要 Node。** 这是 clone-and-own 的一个直接后果，也是
  模型最容易多此一举的地方（它会想去 `npm install` 主题）。
- **搜索索引是独立的构建后步骤**：`npx pagefind --site public`。
  **`hugo server` 下索引根本不存在** —— 本地搜不到不是 bug。
- **改了主题源码才需要 Node 工具链**，且顺序是 `css:build && ts:build` 然后 hugo。
  顺序错了拿到的是**陈旧产物且不报错**。这条属主题开发，只写一句带过（§1）。

### 9.3 「不存在的东西」

参照项目那份 skill 的真实增量就是这一段（§2：那句「不要编参数」是 skill 作者加的，
官方文档没有）。这套主题对应要点名的：

- 没有 CLI，没有 `atlas init` 这类脚手架命令。建站是 `hugo new site` + 拷主题。
- 不是 Hugo Module，**`hugo mod get` 装不上**。模型见到 Hugo 主题就会去试模块方式，
  这是最可能编出来的一条。
- `pnpm dev` / `pnpm build` 不能用在自己的站点上（§9.1）。

## 10. 动笔前要先验的事

**§5、§8、§9.1 已经验过，判据都在上面。**

### 10.1 已补验的六项（2026-09-03）

1. **`filetree` 是围栏语言，不是 shortcode。** `layouts/_markup/render-codeblock-filetree.html`。
   连它一共 **9 个围栏语言**：`checksums` `chem` `echarts` `filetree` `gallery`
   `goat` `math` `mermaid` `plantuml`（判据：`ls layouts/_markup/render-codeblock-*.html`）。
   `mermaid` / `echarts` 两个名字确认存在，先前是推断。
2. **`validate-enum` 在 shortcode 里只有 1 处**（`badge.html:31`，
   `neutral|info|success|warning|danger`）。另外 7 处都在 landing / shell partial
   里。所以 §7 把「枚举取值」列为可抽是**过头了** —— 抽出来只有一条。
3. **3 个位置参数的语义已读到**：`kbd` 收若干按键名（有序序列）；`param` 收一个
   页面参数名；`download` 收一个 `data/download/<key>.yaml` 的文件名。
4. **30/30 模板的头注释首行都是「一句话 + 调用示例」**，但**是中文**。skill 是
   英文（§4），所以描述这一列**不能机械搬**，要照注释手写英文。
5. **`.Inner` 分类实测**：15 个读（`InnerDeindent` 11 + `Inner` 4），15 个不读。
   `comment.html` 那个是 `{{ if false }}{{ .Inner }}{{ end }}` —— 故意写成永不执行
   的形式，只为让 Hugo 的静态扫描认定它可成对。**生成器按文本 grep 会把它算进
   「读」，而这一次结论恰好正确**（它确实允许成对）。但这说明抽取必须**跳过注释块**，
   否则别处的注释里提到 `.Inner` 就会误判。
6. **头注释的示例本身可能是错的。** `xref` 的注释写 `{{< xref fig="2.3" >}}`，而它
   读 `.InnerDeindent`，实际调用必须是 `{{< xref fig="1" />}}`（判据：
   `exampleSite/content/docs/components/book.md:66`）。**模型照注释抄会硬错。**
   → 生成的事实（读不读 `.Inner`）比注释可靠，冲突时以生成的为准，并且**注释里的
   示例不要原样搬进 skill**。

### 10.2 还没验的

下面这些写之前逐条落地：

| # | 要验什么 | 怎么验 | 为什么不能靠推断 |
|---|---|---|---|
| 1 | 从零建一个新站的最小步骤 | 在仓库外 `hugo new site`，拷主题，贴 §8 的配置，`hugo server` 打开 | §9.1 已证明 `pnpm dev` 不是这条路；最小配置集要靠真建一次才敢写 |
| 2 | ~~9 个围栏语言各自的属性语法~~ | 读 `render-codeblock-*.html` | 只确认了名字；`{num="1" caption="…"}` 这类块属性的允许键没核 → **已做，见 §14** |
| 3 | ~~22 个 landing section 的字段~~ | 读 `layouts/_partials/landing/section/*.html` | skill 要不要覆盖 landing 还没定；覆盖的话字段量比 shortcode 还大 → **已做，见 §15** |

**组件不止 shortcode 一种形态** —— 还有 9 个围栏语言、类名标记（`.steps`
`.cards`）、22 个 landing section。清单表只列 shortcode 的话，模型会以为
`filetree` 得写成 `{{< filetree >}}`。这个错误的形态是「构建绿、页面上什么都没有」。

**范围决定（当时定）：第一版覆盖 30 个 shortcode + 9 个围栏语言，不覆盖 landing。**
理由：landing 是整页布局，作者是在写 `content/landing/index.md` 的 front matter，
那是另一类任务，值得单独一份附属文件；先把正文创作这条路做完整。

**后续推翻了后半句**：landing 确实是另一类任务，但「值得单独一份附属文件」正是做它的
理由而不是不做的理由 —— 正文那条路做完之后就补上了，见 §15。

## 11. 交付顺序

按用户已选的第一步排：

1. ~~**生成器 + `shortcodes.md` + `--check` 门禁**（§7）。~~ **已完成，见 §12。**
2. ~~`config.md`~~ **已完成，见 §13。**
3. ~~`commands.md`~~ **已完成，见 §13。**
4. ~~`SKILL.md`~~ **已完成，见 §13。**
5. ~~`evals.json`~~ **已完成，见 §13。**
6. ~~`README.md` 加安装说明~~ **已完成，见 §13。**

提交纪律照仓库铁律：生成物与源码分开提交。提交前查机器路径与参照信息
（`atlas-no-reference-mentions` 那条记忆里的 `git grep` 命令）。

## 12. 第一步的执行记录（2026-09-03）

`scripts/gen-skill-shortcodes.js`（500 行）→ `skills/hugo-theme-atlas/shortcodes.md`
（319 行，30 个条目）。挂进 `pnpm check` 末位，另有 `pnpm gen:skill`。

### 12.1 抽取出来的事实

| 事实 | 怎么抽 | 覆盖 |
|---|---|---|
| 参数白名单 | `"allowed" (slice …)`，跨行按配对括号取 | 23 个（含 2 个走 `DELEGATES` 到 `openapi-embed.html`） |
| 调用形式 | `"form"` 键 | 3 个 positional、4 个 none、其余 named |
| 成对/自闭合 | 剥掉注释块后查 `.Inner` / `.InnerDeindent` | 15 个读 body，15 个不读 |
| 空 body 是否出声 | `warnf … rendering nothing` | `fields` `tabs` 出声，`cards` `steps` 静默 |
| 枚举取值 | `validate-enum` 的 allowed | 1 个（`badge.tone`） |

### 12.2 手写的六张小表，各自带断言

生成不出来的都收在脚本顶部的常量里，**每一张都有一条能让门禁非零退出的断言** ——
手写表最容易变成没人维护的假事实，所以它们不能只是注释。

| 表 | 装什么 | 断言 |
|---|---|---|
| `DESCRIPTIONS` | 30 句英文说明 | 少一条就非零；有模板已删的条目也非零 |
| `POSITIONAL` | 3 个位置参数的形状与语义 | `form` 是 positional 而表里没有就非零 |
| `CONTAINERS` | 4 个容器要求的子元素 | 列了它但模板不读 body 就非零 |
| `CHILD_OF` | 3 个子元素反查父容器 | 同上的存在性检查 |
| `NEEDS` + `NEEDS_PROOF` | 4 个还需要站点侧文件的 | 模板里查不到对应标记就非零 |
| `SHOW` | 1 个参数互斥的示例覆写 | 写了不在白名单里的参数名就非零 |
| `PREFER` | 1 个有更该用写法的（`steps`） | 存在性检查 |

### 12.3 七种失败模式，全部实测响过

判据都是临时改一处再跑，改回后确认恢复绿：

1. 生成物被改一个字 → `--check` 非零
2. 模板参数变了而生成物没跟 → `--check` 非零
3. 新增模板但没写描述 → 非零
4. `NEEDS` 说读某个东西而模板已不读 → 非零
5. `SHOW` 写了不存在的参数名 → 非零
6. `CONTAINERS` 与模板脱节 → 非零（代码路径同 4，未单独触发）
7. 手写表里有已删模板的条目 → 非零（代码路径同 3）

### 12.4 生成物里的四条断言，用真构建验过

**门禁只证明文件与模板一致，不证明文件里的说法是对的。** 所以另建了一个临时夹具
（`exampleSite/content/docs/zzverify/`，验完已删）真构建：

| 断言 | 实测结果 |
|---|---|
| 不读 body 的带闭合标签 → 硬错 | `shortcode "badge" does not evaluate .Inner or .InnerDeindent, yet a closing tag was provided` |
| 读 body 的不成对 → 硬错 | `shortcode "card" must be closed or self-closed` |
| 自闭合容器 → 构建绿、渲染空 | `cards` 无警告，产出 `<div class="td-cards"></div>`；`fields` warn 后什么都不出 |
| 参数名打错 → 构建绿 | warn 里带上了允许的参数名，值被忽略，`--panicOnWarning` 才拦 |

前两条的错误原文已经嵌进生成物的开头 —— 模型见过原文，撞上时能对号。

### 12.5 顺手纠正的三处

- **`steps` 不是主路径。** 主路径是给有序列表标 `{.steps}`（真 `<ol>`，屏幕阅读器
  报「列表，N 项」）。`exampleSite` 里 `{{< steps >}}` 一次调用都没有。不写这条，
  模型会默认用 shortcode 并交付可访问性更差的产物，而那个差别在渲染结果上看不出来。
- **`xref` 的四个 kind 互斥**（`xref.html:22` warn「accepts only one of」），所以
  示例不能并列两个。
- **示例用真实参数名而不是 `key="value"`。** 模型会照抄占位符，抄出来的正是这份
  文件要防的那种静默失效。

### 12.6 已知未做

- `scripts/` 目录本来不在 `lint` / `format:check` 覆盖范围内（`lint` 只看
  `src/ts`，10 个 script 里 4 个不是 prettier 格式）。新脚本跑了 prettier，但
  没把覆盖范围扩到 `scripts/` —— 那是无关的清理。
- 围栏语言的属性语法（§10.2 第 2 项）没做。`shortcodes.md` 只覆盖 shortcode，
  9 个围栏语言要等下一份文件。

## 13. 其余四份的执行记录（2026-09-03）

skill 交付完成，五个文件：`SKILL.md`(125) `config.md`(134) `commands.md`(109)
`shortcodes.md`(319，生成) `evals/evals.json`(12 条)。

### 13.1 §10.2 第 1 项：真建了一个新站

在仓库外 `hugo new site`，拷主题，逐条加配置再量。这一步的产出不是「跑通了」，
是**五条配置各自漏掉时的确切症状**，全部写进了 `config.md` 与 README：

| 漏掉 | 实测症状 |
|---|---|
| `noClasses = false` | 代码块出 `style="color:#66d9ef"` 内联样式；补上后内联色 0 处、类名 7 处 |
| `unsafe = true` | `<div>` 被换成 `<!-- raw HTML omitted -->` |
| `wrapStandAloneImageWithinParagraph` | 图仍在 `<p>` 里 |
| `attribute.block = true` | `{class="x"}` 渲染成正文，引号被转成弯引号；补上后是 `class="td-image x"` |
| passthrough | `$E = mc^2$` 原样输出；补上后走 katex |

### 13.2 顺手发现的一个真实缺口

**`data/` 是主题运行时的必需目录，而 README 的目录一节没列它。** 我按自己写的
清单拷主题时漏了它，构建绿，只在日志里留一句
`icon: unknown name "copy" (see data/icons.json); emitting nothing` —— 整站图标
静默消失。补进 `commands.md` 与 README，完整清单是五个目录加两个文件。

README 的「站点侧要求」原来只写了 `noClasses` 一条，也一并补齐成五条。

### 13.3 三处凭印象写错、被核实推翻的

- **图标不是「Font Awesome class pair」。** 是 `data/icons.json` 的 key（76 个），
  渲染成同文档的内联 SVG sprite。这条是从无关上下文带过来的。
- **`--panicOnWarning` 真能拦参数打错**（实测 exit 0 → exit 1），先前只是推断。
- **`evals.json` 我说过一次「坏了」，其实是有效的**（12 条齐全），截断只发生在
  工具回显里。凭印象说文件坏掉，是记忆里明令不许做的事。

### 13.4 用了官方 skill-creator 的校验器

`plugins/skill-creator/scripts/quick_validate.py` 报 `user-invocable` 不在允许字段
里。**查证后认定是校验器的名单过期，不是写错** —— 官方 frontmatter 参考表里有这个
字段（用于「只该由模型加载、用户不必手动调用」的背景知识型 skill）。字段保留；
去掉那一行后校验器输出 `Skill is valid!`。

两个可复用的点：

- 那个脚本 `read_text()` 没指定编码，在本机（ACP 936）遇到非 ASCII 直接崩。
  要用得加 `PYTHONUTF8=1`。
- 它明确指出「模型倾向于**不**触发该触发的 skill」，建议 description 写得更主动。
  据此重写了 description（679 字符，上限 1536）：点名 `themes/hugo-theme-atlas`、
  `td-` 类名这些可观测线索，以及「即便没点名主题也要用」。`evals.json` 也照它的
  schema 放在 `evals/` 下。

### 13.5 evals 的取向

12 条里 11 条正向、1 条反向（要求不触发）。**每条针对的都是「构建绿而结果错」的
失败**，因为「构建成功」在这套主题里不构成证据。例如第 3 条要求模型写 `{.steps}`
而不是 `{{< steps >}}`，第 5 条要求拷贝清单里必须有 `data/`。

**跑过了，但结论只有一半可用。**「需要 API key」是我先前写错的理由 —— `run_eval.py`
不读 key，它 shell 出去调 `claude -p`，继承 `~/.claude/settings.json` 里已有的凭据。

装法：临时拷到 `~/.claude/skills/`，跑完删掉。仓库一个字节不动。

**触发是好的。** 判据：在仓库根直接 `claude -p "Add a grid of three cards to a docs
page in this Hugo theme."`，读它的 stream-json，第一个工具调用就是
`Skill:hugo-theme-atlas`。所以 `user-invocable: false` 不妨碍模型自己选中它。

**运行器报的「14 条全 0」是运行器的事，不是 description 的事。** 它在项目
`.claude/commands/` 下临时造一个 `<name>-skill-<uid>.md`，只检测这个名字有没有被
引用；真实 skill 以自己的名字触发，它数不到。它测的不是我装的那个。

顺带发现插件自身三处不一致，都以代码为准：`references/schemas.md` 写字段名
`prompt`，代码读 `query`（已改）；schemas 写顶层是带 `evals` 键的对象，代码直接迭代
顶层，要裸数组（喂它一份临时的，仓库里那份保持对象形状，因为它带 `skill_name` 和
`notes`，是给人读的）；`scripts.utils` 要 `PYTHONPATH` 指到 skill 根才 import 得到。

**期望没有逐条核过** —— 运行器只数触发率，不比对 `expectations`。三条实跑的结果见
§16。

## 15. landing 的执行记录（2026-09-04）

补 §10.2 第 3 项，也就是上面那条被推翻的范围决定。

### 15.1 形状与前两份都不同

**landing 有两层允许键**，shortcode 和围栏都只有一层：

- section 自己的键 → `landing/keys.html` 的 `allowed`
- `items` 里每项的键 → `landing/items.html` 的 `allowed`

一个 section 文件里因此有两处 `"allowed"`，抽取要按调用点分别取，只认第一处会把
每项的键整类丢掉。22/22 都抽出来了，13 个有 `items`。

还有第三层：`actions`（5 个 section 允许它）走 `landing/actions.html`，键是
`text href style icon`。公共键（`type id tone title subtitle eyebrow`）和 `tone`
的取值（`plain muted accent`）各从自己的所有者抽，不手写 —— 它们是 22 个 section
共用的，手写一份就是加一处会漂的地方。

### 15.2 最值钱的一类事实：必需字段

漏一个必需字段的表现分两种，**实测 22 : 4**：`skipping it` 只丢那一项，
`rendering nothing` 整节不出。对作者是两条完全不同的排查路径，所以跟键名一起抽。

`pricing-compare` 有一条散文式的警告：`requires a non-empty plans array;
rendering nothing`。宽松的正则会把 `a` 当成键名抽出来 —— 凭空造一个不存在的键，
模型会照着写。所以正则收紧到分号结尾的单个词。

但收紧之后这条真的必需项就漏了，而 `plans` 是真键。**三条路选了第三条**：不放宽正则
（会造假键）、不改模板措辞（`tests/invalid/landing.md:169` 锁着这句原话，且「非空」
比「有这个键」更准，空数组和缺键是两种输入），而是照本仓库已有的「手写表 + 判据」
模式补一条 `PROSE_REQUIRED`，附一个能在模板里查到的标记：措辞一改门禁就响。

### 15.3 门禁验过的五种失效

逐个改坏输入，确认非零退出，跑完还原（`git status` 干净）：

1. 生成物与 partial 漂移。
2. `PROSE_REQUIRED` 引的措辞在模板里不存在了。
3. 新增 section 而 `SECTIONS` 没描述它。
4. 某个 section 开始吃 `data` 键而 `NEEDS_DATA` 没记（反向检查）。
5. `keys.html` 的公共键抽不出来。

外加一条：`PROSE_REQUIRED` 登记了模板 allowed 里不存在的键。

### 15.4 连带改动

`package.json` 的 `check:skill` / `gen:skill` 各串三个脚本。`SKILL.md` 路由表加
`landing.md`、创作规则加「landing 页面不含 shortcode」、诊断清单加第 7 条，
description 加 `22 landing sections` 和 `building a landing page` 两个触发线索
（现 741 字符，上限 1536）。

### 15.5 一处自我纠正

我先前说「14 个 section 有 items」，那是 `grep -c` 数出来的，把 `case-study` 算进去
了 —— 它只在注释里提到 `items.html`，说明自己为什么**不**用（一个案例只有一份叙述，
`items` 名额没意义，它的 metrics 自己走一遍）。实际是 13 个。以生成器为准。

## 14. 围栏语言的执行记录（2026-09-03）

补 §10.2 第 2 项。这是 `SKILL.md` 自己开的口子：它告诉模型那 9 个围栏语言存在，
却没给属性语法，模型只能猜。

### 14.1 为什么单独一个生成器

`scripts/gen-skill-fences.js`，不合进 `gen-skill-shortcodes.js`。源目录不同
（`_markup/` 而不是 `_shortcodes/`），事实的形状也不同 —— 围栏没有「成对还是自闭合」
这件事，换成「body 是什么格式」。合成一个脚本会得到两套互不相干的分支。

`package.json` 的 `check:skill` / `gen:skill` 各串两个脚本，`check:skill` 已在
`check` 链尾。

### 14.2 抽出来的和手写的

**抽取**：`"allowed"` 后面那个 `slice` 的字符串字面量。9 个 hook 里 8 个写成
`(slice "a" "b")`，`gallery` 写的是不带括号的空 `slice`（它不吃围栏属性，图的说明
写在每一行上）。只认前一种会把它当成抽取失败，所以 `allowed()` 两种都认。

普通代码围栏的属性另取，来自 `layouts/_markup/render-codeblock.html:13`：
`id filename copy collapse wrap`。

**手写**：一句话说明 + body 格式。body 格式抽不出来 —— 每个 hook 自己解析，形状只
写在中文文档注释里。而这恰恰是模型最需要的：属性名猜错只是少一个题注，body 格式
猜错整块不出东西。每条的 body 照 `exampleSite` 的实际写法抄，不照注释里的示例抄
（§10.1 第 6 项：注释里的示例本身可能是错的）。

**只有 `plantuml` 读站点配置**（`params.ui.plantuml.server`）。判据：它是唯一引用
`params.ui.*` 的 hook。没配时降级成普通代码块 —— 构建绿、页面上是源码。

### 14.3 门禁验过的四种失效

逐个临时改坏输入，确认非零退出：

1. 生成物与 hook 漂移（改 hook 的 `allowed` 不重新生成）。
2. 新增 hook 而 `FENCES` 没描述它 —— 否则新围栏会静默缺席。
3. `NEEDS_CONFIG` 过期（hook 不再读那个 key）。
4. `attributes.html` 的共享属性策略变了（三个标记：`"data-"`、`"aria-"`、
   `class, data-*, aria-*`）。

外加一条**反向检查**：某个 hook 开始读 `params.ui.*` 而 `NEEDS_CONFIG` 没记。
漏掉的后果是 skill 不告诉作者要配什么，而没配时那一块静默降级。

### 14.4 两处被实测纠正

- 我先前说未知 shortcode 静默失败。**实测是硬错**：`{{< mermaid >}}` 停构建，
  `template for shortcode "mermaid" not found`。这比我说的**更好**，是这套主题里少数
  几个响亮的失败，写进了生成物。
- 属性不是「各围栏一张表」那么简单。**每个围栏在自己那张表之外一律还接受 `class`、
  `data-*`、`aria-*`**，判据是那条 warn 的措辞把三样和各自的 allowed 拼在一起报出来
  （`allowed: caption, num, id, class, data-*, aria-*`），且未知属性只丢弃不阻断，
  图照样出。不写进生成物的话，模型会以为 `class=` 要另找地方加。

### 14.5 连带改动

`SKILL.md` 的路由表加 `fences.md` 一行，诊断清单加一条围栏专属步骤（花括号属性
行渲染成正文 = 缺 `attribute.block`；图显示成源码 = `plantuml` 缺 server）。

`evals.json` 从 12 条加到 14 条：第 13 条 `plantuml` 要配 server，第 14 条
`filetree` 是围栏不是 shortcode（它有文档页，最容易被写成 `{{< filetree >}}`）。
第 4 条的期望改成引用那条硬错和属性上限。仍然没跑 —— 需要 API key。

（后来跑了，且「需要 API key」这个理由是错的，见 §13.5 与 §16。）

## 16. 逐条核答案的记录（2026-09-04）

运行器只数触发率。答案对不对得人读，所以挑三条实跑 —— 分别代表三类不同的失败。
装法同前：临时拷到 `~/.claude/skills/`，跑完删，仓库不动。

| eval | 核心期望 | 结果 |
|---|---|---|
| 3 `{.steps}` | 用有序列表而不是 shortcode | 过，但**步骤内容**写了 `pnpm install` |
| 5 建站 | 六条 | 全过 |
| 9 `titel=` | 机制 + 参数名 | 机制过，**漏了参数名那条** |

### 16.1 第 3 条：路由漏了一整类任务形态

它拿对了形式（`{.steps}`），内容却编了一套看似合理的安装步骤，第一步 `pnpm install`
—— 而 `commands.md` 明写这个不需要。

原因不在 `commands.md`，在路由。那一行原本写「Starting a site, building, previewing,
or wiring up search」，而这个任务读起来是**写文档**，不是建站。两者共用同一批事实，
路由只覆盖了后者。

改成同时覆盖「把安装步骤作为页面内容写出来」，并直说「看似合理的步骤在这里通常是错
的」。**重跑验证**：它现在开口就是「照 `commands.md`，没有 CLI，没有 `pnpm install`」，
五目录两文件、`data/` 及其后果、markup 块、`--panicOnWarning` 都对，`{.steps}` 也还在。

### 16.2 第 9 条：拼错的参数名会带着人一起错

它答对了机制（warn 不影响退出码、`--panicOnWarning`、两个抓不到的情况），但没说
`badge` 根本没有 `title` —— 正确的是 `text`。期望里本来就有这条，所以是实现侧的缺口
而不是期望写漏了。

问题的形状值得记下来：用户问「我把 `titel=` 写错了」，隐含假设是 `title` 才对。顺着
这个措辞往下答，就会把一个不存在的参数说成合法的。`SKILL.md` 补了一条 ——
**问题里出现的参数名不构成它存在的证据**，要连用户想写的那个一起查。

**重跑验证**：它现在点出 `title` 不存在、正确是 `text`，并带了行号判据。

### 16.3 模型纠正了我一条期望

我第 9 条写「留下一个空徽章」。它说是整个不渲染。查 `badge.html:16,24` —— 两处都是
`rendering nothing`，它对我错，期望已改。

这类事这一轮出现三次（另两次是围栏那轮的未知 shortcode 硬错和共享属性），形状相同：
**我写的是推断，模型读的是模板。**

### 16.4 landing 的 eval 补了两条

第 15 条要求 landing 页面写成 front matter 而不是 shortcode；第 16 条是排查题
（比较表整节不出 → `plans` 空或缺）。现共 16 条。

## 17. 16 条全跑完的记录（2026-09-04）

### 17.1 第一批的结论作废

先跑了 13 条，跑完才发现 **skill 当时没装** —— 我在 §16 收尾时撤过一次，没装回去。
那批答案里的主题知识来自仓库文件和 `CLAUDE.md`，不是来自 skill。**对「skill 有没有
用」不成立**，只对「模型读仓库能答到什么程度」成立，所以 9 条全部重跑。

判据是重跑后的对比：同样的 query，装上之后 `TRIGGERED: true` 且能看到它 `Read` 了
哪一份支撑文件（第 1 条 → `shortcodes.md`，第 4 条 → `fences.md` + `commands.md`，
第 6 条 → `config.md`，第 14 条 → `fences.md`）。先前那批全是 `false`。

### 17.2 16 条的结果

| eval | 触发 | 读了 | 结果 |
|---|---|---|---|
| 1 cards | ✓ | shortcodes.md | 过 |
| 2 xref | **✗** | — | 内容三条全过，但**欠触发**，见 17.3 |
| 3 steps | ✓ | — | 过（§16 已修 `pnpm install`） |
| 4 mermaid | ✓ | fences.md, commands.md | 过 |
| 5 建站 | ✓ | — | 六条全过 |
| 6 深色代码块 | ✓ | config.md | 过（query 先改过，见 17.4） |
| 7 搜索 | ✓ | commands.md | 过，且带出 README 一处真问题 |
| 8 contributors | ✓ | — | 过 |
| 9 `titel=` | ✓ | — | 过（§16 已修参数名那条） |
| 10 fields | ✓ | shortcodes.md | 过 |
| 11 Go 重构（负向） | ✓ 不触发 | — | 过 |
| 12 tabs | ✓ | — | 过 |
| 13 plantuml | ✓ | — | 过 |
| 14 filetree | ✓ | fences.md | 过 |
| 15 landing | ✓ | landing.md | 过 |
| 16 比较表不出 | ✓ | landing.md | 过，且**指出生成物漏了一整类**，见 17.5 |

### 17.3 第 2 条：description 漏了一个触发词

它靠直接读模板答对了 `{{< xref fig="1" />}}`，但没加载 skill。在消费站里没有模板可
读，那条路走不通。原因是 description 点了 `figures` 却没点 `cross-reference`。补上
`cross-referencing a numbered figure or table`。

### 17.4 六条 query 依赖会话上下文，测不到东西

原来 7 条写「this page」「the about page」。`claude -p` 是全新进程，没有会话上下文，
于是模型**正确地**改成反问「哪个页面」—— 测到的是「它会不会追问」，而不是它会不会
用对组件。全部改成点名一个真实存在的文件。

第 14 条是判据：原 query 下它把问题当聊天答了，用的是普通围栏；补上文件名之后，
四条期望全过（`filetree` 围栏、`title`、制表符树、`#` 行尾注释）。

第 6 条另一种毛病：症状在主题仓库里**复现不了**（exampleSite 已配 `noClasses =
false`），模型跑去浏览器实测，发现深色模式是好的，然后一直找下去 —— raw 涨到
1.5 MB 还没停，把整批堵住，我把它停了。query 改成自带前提（「我自己的站」「没有
markup 段」「照文档答，别在这儿复现」）之后一次就过。

### 17.5 模型指出生成物漏了一整类

第 16 条给了 5 个成因并各带行号，其中一条 `landing.md` 里一个字都没有：
`pricing-compare` 的行要求 `values` 是数组、且格数等于 `plans` 的个数。

查证属实。根因是 `required()` 只认 `requires <key>;` 一种句式，而丢弃输入的警告
**另有 12 条别的措辞**。四行都差一格整节就空了，而生成物没提。

修法是加 `constraints()`，直接把警告原文当事实用（去占位符、两个 `%d` 那条改写成
人话），不再手写一份 —— 措辞一改就跟着变。已被 `required()` 或 `PROSE_REQUIRED`
收掉的不重复输出。门禁验过：改一个字的措辞就响。

### 17.6 第 7 条带出的 README 问题

`commands.md` 和 README 都写 `npx pagefind --site public`，对消费站正确。但主题仓库
的 `pnpm build` 用 `--source exampleSite`，产物在 `exampleSite/public` —— 改主题的人
想测搜索会照那行跑然后什么都找不到。`commands.md` 的主题源码那节补了一句。
