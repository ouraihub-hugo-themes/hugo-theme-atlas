---
name: hugo-theme-atlas
description: Authoring and configuring sites built on the Atlas Hugo theme (hugo-theme-atlas) — its 30 shortcodes, 9 fence languages, required site configuration, and commands. Use this skill whenever the project contains themes/hugo-theme-atlas or a td- CSS class, and whenever the task involves writing Hugo content with shortcodes, editing hugo.toml, adding cards/tabs/badges/figures/steps/mermaid diagrams, setting up search, or debugging a page that renders wrong — even when the theme is not mentioned by name. Almost every mistake with this theme still builds successfully, so relying on general Hugo knowledge instead of this skill produces pages that look fine and are quietly wrong.
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
| `fences.md` | Adding a diagram, chart, equation, file tree, image grid, or checksum table. Also generated — it is the authority on fence attributes. |
| `commands.md` | Starting a site, building, previewing, or wiring up search. |

Do not guess a shortcode's parameters. `shortcodes.md` lists every accepted name for
all 30; anything absent from it does not exist.

## The failure mode to design against

Almost everything that goes wrong with this theme **still builds successfully**. There
is no error to read, so a wrong result looks like a correct one:

- A misspelled parameter warns and is ignored; the value is simply missing.
- A missing `markup` setting silently disables a feature (dark-mode code blocks, math,
  block attributes, figures).
- A self-closed container renders an empty container.
- A missing `data/` directory drops every icon.
- A shortcode needing site-side data renders nothing when that data is absent.

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

- **Labels are plain text.** Shortcode parameters do not render Markdown. Landing
  narrative fields do.
- **An `icon` parameter takes a name from the theme's `data/icons.json`** (76 names),
  not a CSS class and not an arbitrary icon-set name. Icons render from an inline SVG
  sprite. An unknown name warns and emits nothing — the page shows no icon at all,
  which is deliberate: a blank square is harder to diagnose.
- **Page-level overrides drop the `ui.` prefix.** Site config uses `params.ui.share`;
  a page's front matter uses `share`.
- **Boolean switches are bare booleans**, except where a multi-setting feature also
  accepts a boolean shorthand.
- Reading shells are `docs`, `book`, `blog`, and `swagger`, set via `type` in front
  matter. Landing is a layout, not a shell.

## When something does not render

Work down this list — it is ordered by how often each is the cause and how silent it is.

1. Is the parameter name in `shortcodes.md`? A typo only warns.
2. Is the call form right — paired, self-closed, or neither? `shortcodes.md` states
   which per shortcode.
3. Does the shortcode need site-side data (`data/*.yaml`, `release_url` in front
   matter)? Those render nothing when it is absent.
4. Is the relevant `markup` setting present? See `config.md`.
5. For a fence: is the brace-attribute line rendering as text? That means
   `attribute.block = true` is missing. Is a diagram showing its source instead? For
   `plantuml` that means `params.ui.plantuml.server` is unset.
6. Is it an icon name missing from `data/icons.json`?

Then rebuild with `--panicOnWarning` and read the warnings.
