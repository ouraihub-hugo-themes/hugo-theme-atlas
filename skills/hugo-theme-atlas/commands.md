# Commands and project layout

This theme is distributed **clone-and-own**, not as a Hugo Module. That single fact
determines every command on this page.

## Contents

- [Things that do not exist](#things-that-do-not-exist)
- [Starting a site](#starting-a-site)
- [Building and previewing](#building-and-previewing)
- [Search requires a separate step](#search-requires-a-separate-step)
- [Changing the theme's own source](#changing-the-themes-own-source)

## Things that do not exist

Check this list before reaching for a command.

- **There is no CLI.** No `atlas init`, no `atlas add`, no scaffolding command. A new
  site is `hugo new site` plus a copy of the theme.
- **`hugo mod get` cannot install this theme.** It is not a Hugo Module. Tailwind
  decides which classes to emit by scanning templates, and a consumer's own templates
  are not scanned at build time — which is why the compiled assets ship in the repo and
  why the theme is copied rather than imported. Adding it to `module.imports` gets you
  a site with no styles.
- **`npm install` / `pnpm install` is not needed to use the theme.** The compiled CSS
  and JS are committed. Node is only needed to modify the theme's own source.
- **The theme's `package.json` scripts are not site-builder commands.** `pnpm dev` and
  `pnpm build` are hardcoded to `--source exampleSite --themesDir ../..`, so they build
  the theme's own example site and nothing else. In your own site, use `hugo` directly.
- **`pnpm run install` is not a thing.** `install` is a package-manager builtin, not a
  script in this repo.

## Starting a site

```sh
hugo new site my-site --format toml
cd my-site
```

Then copy the theme into `themes/hugo-theme-atlas/`. **Five directories plus two files
are required:**

```
themes/hugo-theme-atlas/
  layouts/      templates, shortcodes, render hooks
  assets/       compiled CSS and JS (assets/dist/)
  static/       webfonts
  data/         icons.json — the icon name registry
  i18n/         32 locale files
  hugo.toml     defines the LLMS output format
  theme.toml    theme metadata
```

`data/` is easy to miss and fails in a way that looks unrelated: the build stays green
and prints `icon: unknown name "copy" (see data/icons.json); emitting nothing`, so
icons are silently absent. Verified by omitting it.

Do not copy `src/`, `scripts/`, `tests/`, `node_modules/`, or `exampleSite/` — those
are for developing the theme.

Finally, add the required settings to `hugo.toml`. See `config.md`; without them the
build still succeeds and several features are quietly wrong.

## Building and previewing

```sh
hugo server                       # preview with live reload
hugo                              # build to public/
hugo --printPathWarnings --panicOnWarning   # build, failing on any warning
```

Use the last one before publishing. The theme reports invalid author input as warnings
with a documented fallback rather than as errors, so `hugo server` stays usable while
you work — but that means a plain build hides real mistakes. A misspelled shortcode
parameter only warns; under `--panicOnWarning` it fails the build. Verified: `titel=`
for `title=` exits 0 normally and exits 1 with the flag.

## Search requires a separate step

Search is powered by Pagefind, which indexes the **built output**, so it runs after
Hugo:

```sh
hugo
npx pagefind --site public
```

**Under `hugo server` the index does not exist at all.** Search finding nothing in
local development is expected, not a bug. To test search, build and serve `public/`
statically.

## Changing the theme's own source

Only needed if you are modifying the theme itself, and only inside a clone of the theme
repository.

```sh
pnpm install
pnpm dev      # CSS watch + TS watch + hugo server, against exampleSite
pnpm build    # css:build && ts:build && hugo
pnpm check    # the full gate: format, types, lint, tests, and the checkers
```

**The order in `pnpm build` matters.** CSS and TS must compile before Hugo runs;
otherwise Hugo picks up the previous build's assets and reports nothing wrong. Do not
run `hugo` directly after editing `src/` — run `pnpm build`.

**`pnpm build` writes to `exampleSite/public`, not `public/`**, because it passes
`--source exampleSite`. Testing search in the theme repo therefore needs
`npx pagefind --site exampleSite/public`. The bare `--site public` above is for a
consuming site, where `hugo` runs at the root.

Compiled output under `assets/dist/` is committed, so any source change means
rebuilding and committing the artifacts too.
