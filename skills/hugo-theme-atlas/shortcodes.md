# Shortcode reference

Generated from the templates by `scripts/gen-skill-shortcodes.js`. Do not edit by hand — `node scripts/gen-skill-shortcodes.js --check` fails if this file drifts from them.

Two rules cause most build failures, and neither is guessable from a call site:

1. **A misspelled parameter does not fail the build.** The theme warns and names the allowed parameters, then ignores the value — so `titel=` for `title=` leaves the build green and the title simply absent. Build with `--panicOnWarning` to turn that into a failure. Only the names listed below exist.
2. **Paired vs unpaired is fixed per shortcode, and getting it wrong fails the build.** Each entry below states which form it takes. Two exact errors, both verified:

   - Closing one that takes no body: `shortcode "badge" does not evaluate .Inner or .InnerDeindent, yet a closing tag was provided`
   - Leaving one that takes a body unclosed: `shortcode "card" must be closed or self-closed`

A third failure is silent: self-closing a container. `{{< cards />}}` builds with no warning at all and renders `<div class="td-cards"></div>` — an empty grid.

## Contents

- [badge](#badge) — Inline status badge.
- [book-equations](#book-equations) — List of every numbered equation on the page, in source order.
- [book-examples](#book-examples) — List of every numbered example on the page, in source order.
- [book-figures](#book-figures) — List of every numbered figure on the page, in source order.
- [book-tables](#book-tables) — List of every numbered table on the page, in source order.
- [book-toc](#book-toc) — Table of contents for the current section.
- [card](#card) — One card in a grid. Must be wrapped in `cards`.
- [cards](#cards) — Grid container for `card`. Takes no parameters of its own.
- [cast](#cast) — Terminal session recording from an asciicast file.
- [comment](#comment) — Author note kept in the source and dropped from the output.
- [contributors](#contributors) — Contributor avatar wall built from a local data file. Makes no network requests.
- [download](#download) — Download section with per-channel install instructions, built from a data file.
- [eg](#eg) — Numbered example. Caption on top, body is usually one or more code fences.
- [eq](#eq) — Numbered equation. Body is LaTeX.
- [field](#field) — One field definition. Must be wrapped in `fields`.
- [fields](#fields) — Definition list of `field` children.
- [fig](#fig) — Numbered figure. Either `src` for an image, or a body for arbitrary block content.
- [include](#include) — Pull in another file: a page resource, an assets mount, or another content file.
- [kbd](#kbd) — Key sequence, rendered with separators and a screen-reader-only reading.
- [mindmap](#mindmap) — Mind map drawn in the browser from a nested Markdown list body.
- [param](#param) — Print a page parameter, falling back to site config. Scalars only.
- [redoc](#redoc) — Render an OpenAPI document with Redoc (three-column, read-only).
- [release-assets](#release-assets) — Turn `sha*sum` output into a table of download links and checksums.
- [release-card](#release-card) — Release card: version, date, and four links derived from `release_url`.
- [steps](#steps) — Numbered steps driven by headings in the body.
- [swagger](#swagger) — Render an OpenAPI document with Swagger UI (includes the "try it" panel).
- [tab](#tab) — One tab inside `tabs`.
- [tabs](#tabs) — Tab group.
- [tbl](#tbl) — Numbered table. Body is a Markdown table.
- [xref](#xref) — Cross-reference to a numbered target or an anchor, with a language-correct label.

## badge

Inline status badge.

`{{< badge text="…" tone="…" >}}` — never closed. Adding `{{< /badge >}}` is a build error.

Parameters: `text`, `tone`, `link`, `icon`

`tone` must be one of `neutral`, `info`, `success`, `warning`, `danger`.

## book-equations

List of every numbered equation on the page, in source order.

`{{< book-equations page="…" title="…" >}}` — never closed. Adding `{{< /book-equations >}}` is a build error.

Parameters: `page`, `title`, `class`

`page` takes another page's path, not just this one's — `{{< book-equations page="/docs/fences" >}}` lists that page's targets here. The partial forces the target page's `.Content` first, because Hugo does not guarantee render order and an unrendered page has an empty registry.

## book-examples

List of every numbered example on the page, in source order.

`{{< book-examples page="…" title="…" >}}` — never closed. Adding `{{< /book-examples >}}` is a build error.

Parameters: `page`, `title`, `class`

`page` takes another page's path, not just this one's — `{{< book-examples page="/docs/fences" >}}` lists that page's targets here. The partial forces the target page's `.Content` first, because Hugo does not guarantee render order and an unrendered page has an empty registry.

## book-figures

List of every numbered figure on the page, in source order.

`{{< book-figures page="…" title="…" >}}` — never closed. Adding `{{< /book-figures >}}` is a build error.

Parameters: `page`, `title`, `class`

`page` takes another page's path, not just this one's — `{{< book-figures page="/docs/fences" >}}` lists that page's targets here. The partial forces the target page's `.Content` first, because Hugo does not guarantee render order and an unrendered page has an empty registry.

## book-tables

List of every numbered table on the page, in source order.

`{{< book-tables page="…" title="…" >}}` — never closed. Adding `{{< /book-tables >}}` is a build error.

Parameters: `page`, `title`, `class`

`page` takes another page's path, not just this one's — `{{< book-tables page="/docs/fences" >}}` lists that page's targets here. The partial forces the target page's `.Content` first, because Hugo does not guarantee render order and an unrendered page has an empty registry.

## book-toc

Table of contents for the current section.

`{{< book-toc depth="…" >}}` — never closed. Adding `{{< /book-toc >}}` is a build error.

Parameters: `depth`

## card

One card in a grid. Must be wrapped in `cards`.

`{{< card title="…" link="…" >}}` … `{{< /card >}}` — **or** self-closed `{{< card title="…" link="…" />}}`. Every call in a page must be closed or self-closed; a bare opening tag is a build error.

Parameters: `title`, `link`, `icon`, `badge`, `image`, `image_alt`

Only valid inside `cards`. On its own it renders outside the layout it needs.

**This body is rendered in a second pass**, so Hugo's `{{</* … */>}}` escape does not survive it. An escaped shortcode inside a `card` body is unescaped by the outer render and then executed by the inner one — it runs, warns about its own deliberate mistakes, and under `--panicOnWarning` fails the build. To show shortcode syntax as text, use a fenced code block.

## cards

Grid container for `card`. Takes no parameters of its own.

`{{< cards >}}` … `{{< /cards >}}`, wrapping one or more `card`. Always paired — an empty body renders an empty container and says nothing.

Takes no parameters.

## cast

Terminal session recording from an asciicast file.

`{{< cast src="…" caption="…" >}}` — never closed. Adding `{{< /cast >}}` is a build error.

Parameters: `src`, `caption`, `poster`, `start`

Boolean: `autoplay`, `preload`, `loop` — takes `true` or `false`, nothing else. Any other value warns and falls back to `false`.

`poster` and `start` are passed to the player verbatim — they take asciinema's own syntax (`npt:1:23`, `data:text/plain,…`). The theme validates only that they contain no control characters, so a malformed value reaches the player and fails there, not at build time.

## comment

Author note kept in the source and dropped from the output.

`{{< comment >}}` … `{{< /comment >}}` — **or** self-closed `{{< comment />}}`. Every call in a page must be closed or self-closed; a bare opening tag is a build error.

Takes no parameters.

The body is intentionally never rendered — shortcodes inside a comment do not run, so a commented-out `fig` does not consume a figure number. Self-closing it is legal but pointless.

## contributors

Contributor avatar wall built from a local data file. Makes no network requests.

`{{< contributors data="…" class="…" >}}` — never closed. Adding `{{< /contributors >}}` is a build error.

Parameters: `data`, `class`

**Also requires:** a `data/<key>.yaml` file in the site; the `data` parameter is that filename
Without it the shortcode renders nothing at all — the build still succeeds.

## download

Download section with per-channel install instructions, built from a data file.

`{{< download atlas >}}` — never closed. Adding `{{< /download >}}` is a build error.

Positional, not named. Exactly one: the data filename without its extension.
Named parameters are rejected and warned about, not rendered.

**Also requires:** a `data/download/<key>.yaml` file in the site; the positional argument is that filename
Without it the shortcode renders nothing at all — the build still succeeds.

## eg

Numbered example. Caption on top, body is usually one or more code fences.

`{{< eg num="…" id="…" >}}` … `{{< /eg >}}` — the body is required. Syntactically `{{< eg num="…" id="…" />}}` is legal, but it warns and renders nothing every time. Every call must be closed or self-closed; a bare opening tag is a build error.

Parameters: `num`, `id`, `caption`, `class`

**This body is rendered in a second pass**, so Hugo's `{{</* … */>}}` escape does not survive it. An escaped shortcode inside a `eg` body is unescaped by the outer render and then executed by the inner one — it runs, warns about its own deliberate mistakes, and under `--panicOnWarning` fails the build. To show shortcode syntax as text, use a fenced code block.

## eq

Numbered equation. Body is LaTeX.

`{{< eq num="…" id="…" >}}` … `{{< /eq >}}` — the body is required. Syntactically `{{< eq num="…" id="…" />}}` is legal, but it warns and renders nothing every time. Every call must be closed or self-closed; a bare opening tag is a build error.

Parameters: `num`, `id`, `caption`, `class`

## field

One field definition. Must be wrapped in `fields`.

`{{< field name="…" type="…" >}}` … `{{< /field >}}` — the body is required. Syntactically `{{< field name="…" type="…" />}}` is legal, but it warns and skips itself every time. Every call must be closed or self-closed; a bare opening tag is a build error.

Parameters: `name`, `type`, `required`, `default`

Only valid inside `fields`. On its own it renders outside the layout it needs.

## fields

Definition list of `field` children.

`{{< fields label="…" id="…" >}}` … `{{< /fields >}}`, wrapping one or more `field`. Always paired — an empty body warns and renders nothing.

Parameters: `label`, `id`, `class`

**This body is rendered in a second pass**, so Hugo's `{{</* … */>}}` escape does not survive it. An escaped shortcode inside a `fields` child's body is unescaped by the outer render and then executed by the inner one — it runs, warns about its own deliberate mistakes, and under `--panicOnWarning` fails the build. To show shortcode syntax as text, use a fenced code block.

## fig

Numbered figure. Either `src` for an image, or a body for arbitrary block content.

`{{< fig num="…" id="…" >}}` … `{{< /fig >}}`, **or** `{{< fig num="…" id="…" />}}` with `src`. The body and `src` are the two content sources and are mutually exclusive — but the `src` form still needs the closing slash. `{{< fig src="…" >}}` with neither a body nor a `/` is a build error, not a shorthand.

Parameters: `num`, `id`, `caption`, `class`, `src`, `alt`, `link`, `width`, `height`

**This body is rendered in a second pass**, so Hugo's `{{</* … */>}}` escape does not survive it. An escaped shortcode inside a `fig` body is unescaped by the outer render and then executed by the inner one — it runs, warns about its own deliberate mistakes, and under `--panicOnWarning` fails the build. To show shortcode syntax as text, use a fenced code block.

## include

Pull in another file: a page resource, an assets mount, or another content file.

`{{< include file="…" code="true" >}}` — never closed. Adding `{{< /include >}}` is a build error.

Parameters: `file`, `code`, `lang`

Boolean: `code` — takes `true` or `false`, nothing else. Any other value warns and falls back to `false`.

**Parameters that depend on each other:**

- `lang requires code=true` — otherwise: ignoring lang

**`file` resolves in three places, in order:** the page's own resources, then `assets/`, then `content/`. A leading `/` means the content root and skips the first two; anything else is relative to the current page's directory. Found in none of the three warns and includes nothing.

**This body is rendered in a second pass**, so Hugo's `{{</* … */>}}` escape does not survive it. An escaped shortcode inside a `include` body is unescaped by the outer render and then executed by the inner one — it runs, warns about its own deliberate mistakes, and under `--panicOnWarning` fails the build. To show shortcode syntax as text, use a fenced code block.

## kbd

Key sequence, rendered with separators and a screen-reader-only reading.

`{{< kbd Ctrl Shift P >}}` — never closed. Adding `{{< /kbd >}}` is a build error.

Positional, not named. One argument per key, in order. Any number of keys.
Named parameters are rejected and warned about, not rendered.

## mindmap

Mind map drawn in the browser from a nested Markdown list body.

`{{< mindmap caption="…" num="…" >}}` … `{{< /mindmap >}}` — the body is required. Syntactically `{{< mindmap caption="…" num="…" />}}` is legal, but it warns and renders nothing every time. Every call must be closed or self-closed; a bare opening tag is a build error.

Parameters: `caption`, `num`, `id`, `height`, `expand`

**This body is rendered in a second pass**, so Hugo's `{{</* … */>}}` escape does not survive it. An escaped shortcode inside a `mindmap` body is unescaped by the outer render and then executed by the inner one — it runs, warns about its own deliberate mistakes, and under `--panicOnWarning` fails the build. To show shortcode syntax as text, use a fenced code block.

## param

Print a page parameter, falling back to site config. Scalars only.

`{{< param version >}}` — never closed. Adding `{{< /param >}}` is a build error.

Positional, not named. Exactly one: the parameter name. Scalars only — maps and slices print nothing.
Named parameters are rejected and warned about, not rendered.

## redoc

Render an OpenAPI document with Redoc (three-column, read-only).

`{{< redoc spec="…" height="…" >}}` — never closed. Adding `{{< /redoc >}}` is a build error.

Parameters: `spec`, `height`, `id`
(validated in `layouts/_partials/content/openapi-embed.html`, shared with the other OpenAPI renderer)

**Requires `params.ui.openapi.redoc` in the site config.** Without it renders only a link to the spec, in a container marked `td-openapi-unconfigured` — no warning, green build. Needs `js`. See `params.md`.

## release-assets

Turn `sha*sum` output into a table of download links and checksums.

`{{< release-assets algo="…" base="…" >}}` … `{{< /release-assets >}}` — **or** self-closed `{{< release-assets algo="…" base="…" />}}`. Every call in a page must be closed or self-closed; a bare opening tag is a build error.

Parameters: `algo`, `base`, `src`, `group`

**Parameters that depend on each other:**

- `base is only valid without release_url front matter` — otherwise: skipping the block

**`src` resolves in two places, in order:** the page's own resources, then `assets/`. Unlike `include` there is no `content/` tier. Not found there warns and skips the block. `src` and inner checksum lines are mutually exclusive.

**Also requires:** `release_url` in the page front matter, plus `sha*sum` output as the body
Without it the shortcode renders nothing at all — the build still succeeds.

## release-card

Release card: version, date, and four links derived from `release_url`.

`{{< release-card >}}` — never closed. Adding `{{< /release-card >}}` is a build error.

Takes no parameters.

**Also requires:** `release_url` in the page front matter
Without it the shortcode renders nothing at all — the build still succeeds.

## steps

Numbered steps driven by headings in the body.

`{{% steps %}}` … `{{% /steps %}}` — **`%` delimiters, not `<`.** With `{{<` the body is not parsed as Markdown: headings and code fences render as literal text, with no warning and a green build. Leave a blank line above and below the body so Goldmark sees block boundaries.

Takes no parameters.

**Not the primary path.** Add `{.steps}` to an ordered list instead. That produces a real `<ol>`, so screen readers announce "list, N items" and the numbering comes from the list itself.

Use this shortcode only when a list cannot do the job: the step titles need to appear in the table of contents, or a step has to contain a `%`-delimited container shortcode (list indentation swallows those).

## swagger

Render an OpenAPI document with Swagger UI (includes the "try it" panel).

`{{< swagger spec="…" height="…" >}}` — never closed. Adding `{{< /swagger >}}` is a build error.

Parameters: `spec`, `height`, `id`
(validated in `layouts/_partials/content/openapi-embed.html`, shared with the other OpenAPI renderer)

**Requires `params.ui.openapi.swagger` in the site config.** Without it renders only a link to the spec, in a container marked `td-openapi-unconfigured` — no warning, green build. Needs both `js` and `css`. See `params.md`.

## tab

One tab inside `tabs`.

`{{< tab label="…" value="…" >}}` … `{{< /tab >}}` — **or** self-closed `{{< tab label="…" value="…" />}}`. Every call in a page must be closed or self-closed; a bare opening tag is a build error.

Parameters: `label`, `value`

Only valid inside `tabs`. On its own it renders outside the layout it needs.

## tabs

Tab group.

`{{< tabs group="…" default="…" >}}` … `{{< /tabs >}}`, wrapping one or more `tab`. Always paired — an empty body warns and renders nothing.

Parameters: `group`, `default`, `label`

**This body is rendered in a second pass**, so Hugo's `{{</* … */>}}` escape does not survive it. An escaped shortcode inside a `tabs` child's body is unescaped by the outer render and then executed by the inner one — it runs, warns about its own deliberate mistakes, and under `--panicOnWarning` fails the build. To show shortcode syntax as text, use a fenced code block.

## tbl

Numbered table. Body is a Markdown table.

`{{< tbl num="…" id="…" >}}` … `{{< /tbl >}}` — the body is required. Syntactically `{{< tbl num="…" id="…" />}}` is legal, but it warns and renders nothing every time. Every call must be closed or self-closed; a bare opening tag is a build error.

Parameters: `num`, `id`, `caption`, `class`

**This body is rendered in a second pass**, so Hugo's `{{</* … */>}}` escape does not survive it. An escaped shortcode inside a `tbl` body is unescaped by the outer render and then executed by the inner one — it runs, warns about its own deliberate mistakes, and under `--panicOnWarning` fails the build. To show shortcode syntax as text, use a fenced code block.

## xref

Cross-reference to a numbered target or an anchor, with a language-correct label.

`{{< xref fig="…" >}}` … `{{< /xref >}}` — **or** self-closed `{{< xref fig="…" />}}`. Every call in a page must be closed or self-closed; a bare opening tag is a build error.

Parameters: `fig`, `tbl`, `eq`, `eg`, `page`, `anchor`

Normally self-closed: `{{< xref fig="1" />}}`. Pair it only to supply custom link text, as in `{{< xref fig="2" >}}see the figure above{{< /xref >}}`. `fig`, `tbl`, `eq`, and `eg` are mutually exclusive — pass exactly one, or use `anchor` for an arbitrary fragment. `page` adds a cross-page target.
