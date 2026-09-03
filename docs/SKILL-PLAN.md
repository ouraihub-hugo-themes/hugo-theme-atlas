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
| 枚举取值 | `validate-enum` 调用的取值列表 | `tone="infoo"` 这类值错 |

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

**§5、§8、§9.1 已经验过，判据都在上面。** 下面是还没验的，写之前逐条落地：

| # | 要验什么 | 怎么验 | 为什么不能靠推断 |
|---|---|---|---|
| 1 | 从零建一个新站的最小步骤 | 在仓库外 `hugo new site`，拷主题，贴 §8 的配置，`hugo server` 打开 | §9.1 已证明 `pnpm dev` 不是这条路；最小配置集要靠真建一次才敢写 |
| 2 | `filetree` 是什么 | 读 `layouts/` 与 `exampleSite/content/docs/components/filetree.md` | 有文档页但**不在那 30 个 shortcode 里**，语法未知（可能是围栏语言，也可能是类名标记）——**这是推断，不要当事实** |
| 3 | ` ```mermaid ` / ` ```echarts ` 两个围栏名 | 读对应 render hook | 这两个名字是我推的，没读过 |
| 4 | 3 个位置参数 shortcode 的参数语义 | 读 `kbd` `param` `download` 的文档注释 | §7 已证明抽不出来，必须手写 |
| 5 | `validate-enum` 的调用点与取值 | `grep -rn validate-enum layouts/` | §7 那张表把它列为可抽，但**没核过写法**，可能跟 `allowed` 一样有委托的情况 |
| 6 | 组件清单表里每个条目名与实际文件名一致 | 对 `layouts/_shortcodes/` 做 `ls` | `HANDOFF.md` §9 明确「核对以 `ls` 为准，不以表为准」 |

第 2、3 项是同一类问题：**组件不止 shortcode 一种形态**（还有围栏语言、类名标记
如 `.steps` / `.cards`）。清单表要是只列 shortcode，模型就会以为 `filetree` 得写成
`{{< filetree >}}`。这个错误的形态是「构建绿、页面上什么都没有」。

## 11. 交付顺序

按用户已选的第一步排：

1. **生成器 + `shortcodes.md` + `--check` 门禁**（§7）。先做这个，因为它是唯一
   有漂移风险的一份，且体量最大。
2. `config.md`（§8，材料齐了，翻译工作）。
3. `commands.md`（§9，先做完 §10 第 1 项）。
4. `SKILL.md`（导航 + 组件清单，需要 §10 第 2/3/5 项的结论）。
5. `evals.json`。
6. `README.md` 加安装说明（§4：拷进消费方 `.claude/skills/`）。

提交纪律照仓库铁律：生成物与源码分开提交。提交前查机器路径与参照信息
（`atlas-no-reference-mentions` 那条记忆里的 `git grep` 命令）。
