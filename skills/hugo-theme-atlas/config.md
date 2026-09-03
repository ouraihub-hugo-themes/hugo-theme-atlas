# Site configuration

The theme cannot supply defaults for any of the settings on this page. **Hugo ignores
`markup` settings that come from a theme**, so every one of them has to be in the
site's own configuration.

Each omission fails the same way: the build succeeds, prints nothing, and one feature
is quietly wrong. Every symptom below was measured on a fresh `hugo new site` with the
theme attached — first without the setting, then with it.

## Contents

- [The block to paste](#the-block-to-paste)
- [What each setting does](#what-each-setting-does)
- [The rest of a working config](#the-rest-of-a-working-config)
- [Enabling custom output formats](#enabling-custom-output-formats)
- [Verifying the config is complete](#verifying-the-config-is-complete)

## The block to paste

Copy this into the site's `hugo.toml` verbatim. Do not paste a subset — a partial
`markup` tree silently changes which of the five are active, and TOML nests these
tables in a way that is easy to get subtly wrong.

```toml
[markup.goldmark.renderer]
unsafe = true

[markup.goldmark.parser]
wrapStandAloneImageWithinParagraph = false

[markup.goldmark.parser.attribute]
block = true

[markup.goldmark.extensions.passthrough]
enable = true

[markup.goldmark.extensions.passthrough.delimiters]
inline = [['$', '$'], ['\(', '\)']]
block = [['$$', '$$'], ['\[', '\]']]

[markup.highlight]
noClasses = false
```

## What each setting does

| Setting | Without it | With it |
|---|---|---|
| `highlight.noClasses = false` | Chroma emits `style="color:#66d9ef"` inline, so code blocks keep light-mode colours after a theme switch | Emits class names the theme's stylesheet matches |
| `renderer.unsafe = true` | Raw HTML in content is replaced by `<!-- raw HTML omitted -->` | Raw HTML passes through |
| `parser.wrapStandAloneImageWithinParagraph = false` | A standalone image stays inside `<p>`, so `.IsBlock` is always false and figure handling and size overrides never apply | The image render hook sees a block |
| `parser.attribute.block = true` | `{class="x"}` renders as body text, with the quotes turned into typographic quotes | The attribute applies: `class="td-image x"` |
| `extensions.passthrough` | `$E = mc^2$` renders as literal text with dollar signs | Renders as math |

Two details worth keeping:

- `noClasses = true` is **Hugo's default**, so this is one of the settings you have to
  actively turn off rather than one you can forget about.
- A ` ```math ` fence does not go through passthrough, so fenced math works even
  without the passthrough setting. Only inline and `$$…$$` math depends on it.

## The rest of a working config

Four keys are enough to build:

```toml
baseURL = "https://example.org/"
locale = "en-US"
title = "Your site"
theme = "hugo-theme-atlas"
```

`locale` is the current key name. `languageCode` was renamed and no longer works on
the Hugo versions this theme supports (0.160.1 and up).

Configuration is not the only requirement — the theme also has to be copied completely.
See `commands.md`; a missing `data/` directory drops every icon while the build stays
green.

Everything else is optional and degrades on purpose:

| Omitted | Result |
|---|---|
| `menu.main` | The navbar falls back to top-level sections |
| `menu.footer` | The footer shows only branding and copyright, no empty columns |
| `params.ui.repo` | No "edit this page" link |
| `params.ui.share` | No share bar. This is a list of targets, not a switch — `true` cannot say where to share to |
| `params.ui.plantuml.server` | A ` ```plantuml ` fence renders its source instead of a diagram |

**Theme features that reach the network are off until fully configured.** A normal
build downloads nothing. The theme ships no default PlantUML server on purpose:
pointing at a public one by default would send every site's diagrams to a third party.

## Enabling custom output formats

The theme *defines* the `LLMS` output format but does not enable it. Enabling costs
build time, so it is the site's decision:

```toml
[outputs]
home = ["HTML", "LLMS", "RSS"]
section = ["HTML", "markdown", "RSS"]
page = ["HTML", "markdown"]
```

`markdown` is a Hugo built-in and needs no definition. `LLMS` is a whole-site index,
so it belongs on `home` only — emitting an identical copy per page is pointless.

## Verifying the config is complete

The five settings fail silently, so a green build proves nothing. Build with warnings
promoted to failures:

```sh
hugo --printPathWarnings --panicOnWarning
```

That catches misspelled shortcode parameters and invalid parameter values, which
otherwise only warn — verified: a `titel=` typo exits 0 without the flag and exits 1
with it.

It does **not** catch a missing `markup` setting. Nothing warns about those. To check
them, write a page containing an inline formula, a standalone image followed by
`{class="probe"}`, a raw `<div>`, and a fenced Go code block. Then look for these five
things in the rendered HTML:

| Check | Correct | Wrong |
|---|---|---|
| Code block | `class="kd"` etc. | `style="color:#66d9ef"` |
| Raw `<div>` | present | `<!-- raw HTML omitted -->` |
| Image | not inside `<p>` | inside `<p>` |
| Block attribute | `class="td-image probe"` | `{class=&ldquo;probe&rdquo;}` as text |
| Formula | rendered math | literal `$E = mc^2$` |
