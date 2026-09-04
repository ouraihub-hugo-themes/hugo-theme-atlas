# `params.ui` reference

Generated from the partials that read these settings by `scripts/gen-skill-params.js`. Do not edit by hand — `node scripts/gen-skill-params.js --check` fails if this file drifts.

`config.md` covers the five `markup` settings the theme cannot default. This page covers the eight `params.ui.*` trees. **Every one of them fails silently when its shape is wrong**: the feature stays off and the build stays green. Measured — an agent building a site from these docs guessed the shape of three of them and got all three wrong.

## The eight trees

| Path | Shape |
|---|---|
| `params.ui.search` | bare boolean |
| `params.ui.share` | list of target ids, **not** a boolean |
| `params.ui.typography` | single string, one of an enum |
| `params.ui.repo` | table |
| `params.ui.comments` | table, all four keys or none |
| `params.ui.openapi` | table of two per-renderer tables |
| `params.ui.plantuml` | table |
| `params.ui.shell_types` | list of type names |

## `search`

```toml
[params.ui]
search = true
```

A bare boolean, off by default. Turning it on is not enough — the index is built by `pagefind`, which the consumer runs after `hugo`. See `commands.md`.

## `share`

**15 targets:** `x`, `bluesky`, `mastodon`, `facebook`, `linkedin`, `reddit`, `hackernews`, `telegram`, `whatsapp`, `line`, `weibo`, `chatgpt`, `claude`, `email`, `copy`

```toml
[params.ui]
share = ["x", "bluesky", "linkedin", "email", "copy"]
```

`share = true` warns and renders no bar — a boolean cannot say where to share to. An unknown id drops that one entry and keeps the rest. On a page, `share: false` turns the bar off, or a list overrides the site's.

## `typography`

```toml
[params.ui]
typography = "technical"
```

**A string, not a table.** One of `technical`, `system`; anything else warns and falls back to `technical`. `technical` uses the fonts the theme ships, `system` uses the platform stack. Both compile into the same stylesheet — neither loads a runtime.

## `repo`

```toml
[params.ui.repo]
url = "https://github.com/owner/repo"
branch = "main"                  # default main
subdir = ""                      # the site's subdirectory in the repo
edit = "/edit/{branch}/{path}"    # only for a forge the default does not fit
```

**Keys:** `url`, `branch`, `subdir`, `edit`. Only `url` matters — without it there is no edit link at
all. It must be an absolute `http(s)` URL; a relative one warns and drops the link. The default `edit` template fits GitHub, GitLab, and Gitea. On a page, `edit_page: false` turns the link off for that page.

## `comments`

giscus, off until **completely** configured.

```toml
[params.ui.comments]
repo = "owner/repo"
repo_id = "R_..."
category = "Announcements"
category_id = "DIC_..."
```

**All four of `repo`, `repo_id`, `category`, `category_id` are required** and all four come from giscus.app. Configure some but not all and it warns and stays off. Configure none and it is simply not enabled — no warning. `repo` is `owner/name`, not a URL.

**There is no `provider` key.** The four keys go directly under
`params.ui.comments`; a nested table named after the provider is silently ignored.

**Optional:** `mapping` (`pathname`, `url`, `title`, `og:title`, `specific`, `number`, default `pathname`), `term`, `reactions`, `input_position` (`top` | `bottom`), `theme`, `lang`.

**This is the one documented exception to “page overrides drop the `ui.` prefix.”** The page key is **`comments_off: true`**, not `comments`. The site-side `comments` is a table, so sharing the name would make every page read that table where a boolean belongs and warn `comments must be a boolean; got map[...]`. `comments_off` exists only on pages and only turns comments off — `true` cannot turn them on, because that needs the four ids.

## `openapi`

Required by the `swagger` and `redoc` shortcodes. **Without it both render only a link
to the spec** — a green build, no warning, and a container marked
`td-openapi-unconfigured`.

```toml
[params.ui.openapi.swagger]
js = "https://cdn.example.com/swagger-ui-bundle.js"
css = "https://cdn.example.com/swagger-ui.css"   # required alongside js
integrity = "sha384-…"        # for js; strongly advised cross-origin
css_integrity = "sha384-…"

[params.ui.openapi.redoc]
js = "https://cdn.example.com/redoc.standalone.js"
integrity = "sha384-…"
```

**Per-renderer keys:** `js`, `css`, `integrity`, `css_integrity`. `redoc` takes no `css`.

**The theme bundles neither runtime** — swagger-ui and redoc are 1.5 MB and 1.1 MB, and most sites have no API docs. The site self-hosts them or points at a CDN. This is a real authoring cost, not an oversight: it is why the feature is off by default.

`swagger` needs `css` as well as `js`; supplying only `js` warns and the renderer stays off. A cross-origin `js` without `integrity` warns and loads anyway. A malformed digest warns and loads without it. Nothing here is downloaded at build time — the reader's browser fetches it.

## `plantuml`

```toml
[params.ui.plantuml]
server = "https://www.plantuml.com/plantuml"   # or a self-hosted address
format = "svg"
```

Required by the ` ```plantuml ` fence, which renders its own source until this is set. `format` is `svg`, `png`, default `svg`. `server` must be absolute `http(s)`.

**The theme ships no default server.** Pointing at a public one would send every site's diagrams to a third party. Rendering happens in the reader's browser, not at build time.

## `shell_types`

```toml
[params.ui]
shell_types = ["docs", "book", "blog", "swagger"]
```

The four reading shells — `docs`, `book`, `blog`, `swagger` — are the default. Set this only to extend the set: a `type` listed here gets the reading shell instead of the plain layout. Replacing the list drops the defaults, so include them.

## Page-level keys

Site-side `params.ui.<key>` pairs with a page-side `<key>` — the `ui.` prefix drops. Both positions are looked up for these:

| Page key | Site counterpart | Purpose |
|---|---|---|
| `share` | `params.ui.share` | `false` to turn the bar off, or a list to override |
| `edit_page` | `params.ui.repo` | `false` to drop the edit link on this page |
| `feedback` | `params.ui.repo` | `false` to drop the feedback widget |
| `comments_off` | `params.ui.comments` | **the exception above** — page-only, `true` to turn off |

Page-only presentation keys, no `params.ui` counterpart: `reading_width`
(`slim`, `normal`, `wide`), `featured_image`, `tone`, `note`, `pem`.
