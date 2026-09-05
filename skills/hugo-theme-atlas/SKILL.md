---
name: hugo-theme-atlas
description: Authoring and configuring sites built on the Atlas Hugo theme (hugo-theme-atlas) — its 30 shortcodes, 9 fence languages, 22 landing sections, params.ui settings, data files, required site configuration, and commands. Use this skill whenever the project contains themes/hugo-theme-atlas or a td- CSS class, and whenever the task involves writing Hugo content with shortcodes, editing hugo.toml, setting any params.ui option, building a landing page, adding cards/tabs/badges/figures/steps/mermaid diagrams, cross-referencing a numbered figure or table, enabling comments or an OpenAPI viewer, setting up search, or debugging a page that renders wrong — even when the theme is not mentioned by name. Almost every mistake with this theme still builds successfully, so relying on general Hugo knowledge instead of this skill produces pages that look fine and are quietly wrong.
user-invocable: false
---

# Atlas Hugo theme

A documentation and landing theme for Hugo, distributed **clone-and-own** (not a Hugo
Module). Its public authoring surface is 30 shortcodes, 9 fence languages, 22 landing
sections, and 4 reading shells.

## Read these before acting

| File | When |
|---|---|
| `shortcodes.md` | Writing or fixing any `{{< … >}}` call. Generated from the templates — it is the authority on parameter names and call form. |
| `config.md` | Setting up or debugging `hugo.toml`. Five `markup` settings the theme cannot default. |
| `params.md` | Any `params.ui.*` setting — search, share, typography, repo, comments, openapi, plantuml, shell_types. Generated. **Naming the parameter right is not enough; three of the eight are the wrong *shape* if you guess.** Also the page-level keys and the one exception to the `ui.`-prefix rule. |
| `fences.md` | Adding a diagram, chart, equation, file tree, image grid, or checksum table. Also generated — it is the authority on fence attributes. |
| `tokens.md` | Changing colours, fonts, spacing, or any part of the look. Generated. **Set the `--td-*` name, not the `--color-*` alias** — the alias only feeds Tailwind's utility classes, so setting it changes half the page and builds clean. |
| `landing.md` | Building or editing a landing page. Generated — it is the authority on the 22 sections' keys. Landing is front matter, not shortcodes. |
| `data.md` | Any component that needs a `data/` file — `contributors`, `download`. Generated. **Naming the file right is not enough; the keys inside are what fails silently.** |
| `commands.md` | Starting a site, building, previewing, or wiring up search — **and whenever you write install or setup steps as page content.** A plausible-looking procedure is usually wrong here: there is no CLI, and `pnpm install` is not part of installing the theme. |

Do not guess a shortcode's parameters. `shortcodes.md` lists every accepted name for
all 30; anything absent from it does not exist.

**A parameter name in the question is not evidence the parameter exists.** Someone
asking why `titel=` failed has also assumed `title` is right — and on `badge` it is
not, the parameter is `text`. Check the name they meant, not just the one they typed.

## The failure mode to design against

Almost everything that goes wrong with this theme **still builds successfully**. There
is no error to read, so a wrong result looks like a correct one:

- A misspelled parameter warns and is ignored; the value is simply missing.
- A missing `markup` setting silently disables a feature (dark-mode code blocks, math,
  block attributes, figures).
- A self-closed container renders an empty container.
- A missing `data/` directory drops every icon.
- A shortcode needing site-side data renders nothing when that data is absent.
- **A `params.ui.*` setting written in the wrong shape leaves the feature off.** A map
  where a string belongs, a `provider` key that does not exist, an unconfigured
  `openapi` — all build clean. See `params.md`.
- **An enum given an unknown value falls back and renders**, so the page looks
  finished and says something else. Worse than a missing key, which at least leaves a
  hole you can see.

So: **build with `--panicOnWarning` before claiming a page works**, and check the
rendered HTML rather than the exit code.

```sh
hugo --printPathWarnings --panicOnWarning
```

Two things it will not catch: missing `markup` settings and self-closed containers.
Both are covered in `config.md` and `shortcodes.md`.

## Minimal working setup

```toml
baseURL = "https://example.org/"
locale = "en-US"
title = "Your site"
theme = "hugo-theme-atlas"
```

Plus the `markup` block from `config.md` — not optional, and not defaultable by the
theme. Plus the five theme directories from `commands.md`, `data/` included.

## Picking a component

Start here, then read that component's entry in `shortcodes.md`.

| Goal | Use |
|---|---|
| Inline status label | `badge` |
| Grid of links or topics | `cards` + `card` |
| Numbered procedure | `{.steps}` on an ordered list — **not** the `steps` shortcode |
| Tabbed alternatives (OS, language) | `tabs` + `tab` |
| API or config field list | `fields` + `field` |
| Numbered figure, table, example, equation | `fig`, `tbl`, `eg`, `eq` |
| Reference to one of those | `xref` |
| Auto list of a page's numbered items | `book-figures`, `book-tables`, `book-examples`, `book-equations` |
| Section table of contents | `book-toc` |
| Keyboard shortcut | `kbd` |
| Print a site or page variable | `param` |
| Reuse a file's content | `include` |
| Terminal recording | `cast` |
| OpenAPI document | `swagger` (interactive) or `redoc` (read-only) |
| Release metadata and links | `release-card`, `release-assets` |
| Contributor avatars | `contributors` |
| Install instructions per channel | `download` |
| Mind map | `mindmap` |
| Note to future maintainers, not rendered | `comment` |

Several components are **fence languages, not shortcodes** — write them as a fenced
code block with that language:

`mermaid`, `echarts`, `plantuml`, `math`, `chem`, `goat` (ASCII diagrams),
`filetree`, `gallery`, `checksums`. See `fences.md` for each one's body format and
attributes.

Writing `{{< mermaid >}}` fails the build with `template for shortcode "mermaid" not
found` — one of the few loud failures in this theme.

## Authoring rules

- **Labels are plain text.** Shortcode parameters do not render Markdown, and nothing
  inside them is evaluated at all — `badge="v{{< param product_version >}}"` emits that
  text literally, with no warning. Dynamic values have to go in a body, which is where
  the second pass runs them. Landing narrative fields do render Markdown.
- **An `icon` parameter takes a name from the theme's `data/icons.json`** (72 names),
  not a CSS class and not an arbitrary icon-set name. Icons render from an inline SVG
  sprite. An unknown name warns and emits nothing — the page shows no icon at all,
  which is deliberate: a blank square is harder to diagnose.
- **Page-level overrides drop the `ui.` prefix.** Site config uses `params.ui.share`;
  a page's front matter uses `share`. **One exception:** comments. The page key is
  `comments_off`, not `comments` — `params.md` has the reason and the full list.
- **Documenting shortcode syntax needs a fenced code block. Backticks do not work.**
  Hugo expands shortcodes before Goldmark parses the Markdown, so inline code is not
  yet code when the expansion happens: `` `{{< cards />}}` `` in ordinary prose really
  renders an empty grid mid-sentence, and self-closing a container warns about nothing.
  A fence is the only form that protects the syntax everywhere. Hugo's `{{</* … */>}}`
  escape works in ordinary prose but not inside the container bodies that get a second
  pass — that pass unescapes it and then runs it. `shortcodes.md` marks which.
- **Boolean switches are bare booleans**, except where a multi-setting feature also
  accepts a boolean shorthand.
- Reading shells are `docs`, `book`, `blog`, and `swagger`, set via `type` in front
  matter. Landing is a layout, not a shell.
- **A landing page carries no shortcodes.** It is `layout: landing` plus a `sections:`
  array in front matter, one entry per section. See `landing.md`.

## Finding a component's CSS classes

**The class name is not the shortcode name.** `fig` emits `td-book-figure`, not
`td-fig` — the four numbered targets `fig`/`tbl`/`eq`/`eg` all share that root and
differ by a `--fig`/`--tbl`/`--eq`/`--eg` suffix. Grepping the name you called comes
back empty.

Read the component's template instead — `layouts/_shortcodes/<name>.html`,
`layouts/_markup/render-codeblock-<lang>.html`, or
`layouts/_partials/landing/section/<name>.html`. All 22 landing sections and 7 of the 9
fences carry their classes as literals. Three kinds of shortcode do not:

- **Delegates to a partial** — `card`, `download`, `contributors`, `release-assets`,
  `swagger`, `redoc`, `book-figures`, `book-tables`, `book-examples`, `book-equations`.
  The partial's path is named in the same file, one hop away (`card` →
  `content/card-markup.html`).
- **Child shortcodes whose markup lives in the parent** — `field` and `tab` only
  register themselves; the classes are all in `fields.html` and `tabs.html`.
- **Emits no wrapper** — `param` prints a bare value, `include` renders the included
  file's own markup, `comment` prints nothing. There is no class to target.

Two things that grep will not tell you:

- **Variant classes are assembled at render time** (`printf "td-callout--%s" $type`), so
  `td-callout--note` appears in no template. Read the enum in the template, or read the
  built HTML in `public/`.
- **A class with no CSS rule is normal, not a bug.** Some tenth of the classes in the
  output are semantic markers carrying no styling — the four shell markers
  (`td-shell-docs`, `td-shell-book`, `td-shell-blog`, `td-shell-swagger`) and the
  `xref`/figure kind markers (`td-book-figure--fig`, `td-book-xref--tbl`) among them.
  They exist to be hooked, by your CSS or by tests. **A variant with no rule of its own
  is also normal** when the base class already carries that state: `td-badge--neutral`
  has no rule because `.td-badge` is neutral by default. The reverse case exists too —
  classes present in CSS but in no built page, because JS adds them at runtime
  (`td-search-*`, `td-palette-*`, `td-scroll-locked`) or because the feature is off in
  that build (`td-comments-*` needs giscus configured). **Do not "fix" any of these.**

**Before overriding a class, check `tokens.md`.** Most restyling is one custom property,
and a token change carries through light mode, dark mode, print, and forced colors at
once. Overriding a class reaches one component in one mode. When a class override really
is the answer, edit `src/css/<component>.css` and run `pnpm css:build` — never
`assets/dist/`, which is generated.

**To add a stylesheet, create `assets/css/custom.css`.** The theme loads it right after
its own, with the same fingerprint and `integrity` handling. Its presence is the switch —
there is no config key, and no file means nothing is emitted. Do not override
`head/css.html` to append one; that copies the fingerprint branches, which then go stale
silently. It is served as-is, so plain CSS only — no `@utility`, no `@theme`.

## When something does not render

Work down this list — it is ordered by how often each is the cause and how silent it is.

1. Is the parameter name in `shortcodes.md`? A typo only warns.
2. Is the call form right — paired, self-closed, or neither? `shortcodes.md` states
   which per shortcode.
3. Does the shortcode need site-side data (`data/*.yaml`, `release_url` in front
   matter)? Those render nothing when it is absent — **and equally when the file
   exists with the wrong keys.** `data.md` has the schemas; do not guess them.
4. Is the relevant `markup` setting present? See `config.md`.
5. Does it need a `params.ui.*` setting, and is that setting the right *shape*?
   `swagger` and `redoc` render only a link without `params.ui.openapi`; comments need
   all four giscus ids or none. See `params.md`.
6. For a fence: is the brace-attribute line rendering as text? That means
   `attribute.block = true` is missing. Is a diagram showing its source instead? For
   `plantuml` that means `params.ui.plantuml.server` is unset.
7. Is it an icon name missing from `data/icons.json`?
8. On a landing page: is a required key missing? That drops the entry, or the whole
   section, silently. `landing.md` states which per section.
9. Is an attribute or enum *present but constrained*? `checksums`'s `group` accepts only
   `auto`; `capabilities.status` and `timeline.status` are three-value enums. A rejected
   value warns and falls back — the block still renders.

Then rebuild with `--panicOnWarning` and read the warnings.
