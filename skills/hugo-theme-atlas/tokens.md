# Theme tokens

Generated from `src/css/theme.css` by `scripts/gen-skill-tokens.js`. Do not edit.

Restyling this theme means setting a custom property, not overriding a class. There is one token layer — no preprocessor variables — so the same name works in light mode, dark mode, print, and forced colors.

## Set `--td-*`, not `--color-*`

`--color-*`, `--font-*`, and `--shadow-*` are **mappings** — 34 of them, declared in `@theme inline` so that Tailwind generates utility classes. Component CSS reads the underlying `--td-*` directly.

So setting `--color-accent` changes what `bg-accent` paints and leaves every component reading `--td-accent` untouched. The page half-changes and the build stays green. **Set the `--td-*` name.**

Two places to put them. Editing `src/css/theme.css` and running `pnpm css:build` is the clone-and-own path — that file is yours. To keep customisation outside the theme's own files (so an upstream rebase has nothing to conflict with), create **`assets/css/custom.css`**: the theme loads it right after its own stylesheet, with the same fingerprint and `integrity` treatment in production. No config key — the file's presence is the switch, and its absence emits nothing.

```css
/* assets/css/custom.css — loaded after the theme's stylesheet */
:root {
  --td-accent: oklch(0.55 0.19 250);
  --td-shell-sidebar-w: 20rem;
}

[data-td-theme="dark"] {
  --td-accent: oklch(0.72 0.15 250);
}
```

## Tokens with a utility alias

Set the left column. The Tailwind column is the alias to use when you are writing markup instead of CSS: `--color-*` generates `bg-*` / `text-*` / `border-*`, `--font-*` generates `font-*`, `--shadow-*` generates `shadow-*`.

**Dark** is what happens in dark mode. `✓` means `[data-td-theme="dark"]` re-declares it, so your override needs to appear in both blocks. `via …` means it is an alias and dark mode already follows through it — override the named token instead. Blank means the one value serves both modes.

| Token | Tailwind | Dark |
|---|---|---|
| `--td-canvas` | `--color-canvas` | ✓ |
| `--td-ink` | `--color-ink` | ✓ |
| `--td-ink-strong` | `--color-ink-strong` | ✓ |
| `--td-ink-muted` | `--color-ink-muted` | ✓ |
| `--td-ink-faint` | `--color-ink-faint` | ✓ |
| `--td-surface` | `--color-surface` | ✓ |
| `--td-surface-raised` | `--color-surface-raised` | ✓ |
| `--td-elev` | `--color-elev` | ✓ |
| `--td-border` | `--color-border` | ✓ |
| `--td-link` | `--color-link` | ✓ |
| `--td-link-hover` | `--color-link-hover` | ✓ |
| `--td-accent` | `--color-accent` | via `--td-link` |
| `--td-accent-hover` | `--color-accent-hover` | via `--td-link-hover` |
| `--td-code` | `--color-code` | ✓ |
| `--td-pre` | `--color-pre` | ✓ |
| `--td-shell-card` | `--color-shell-card` | ✓ |
| `--td-shell-popover` | `--color-shell-popover` | via `--td-elev` |
| `--td-shell-rail` | `--color-shell-rail` | ✓ |
| `--td-shell-selected` | `--color-shell-selected` |  |
| `--td-shell-wash` | `--color-shell-wash` |  |
| `--td-nav-bg` | `--color-nav` | ✓ |
| `--td-copper` | `--color-copper` | ✓ |
| `--td-status-info` | `--color-status-info` | ✓ |
| `--td-status-success` | `--color-status-success` | ✓ |
| `--td-status-warning` | `--color-status-warning` | ✓ |
| `--td-status-danger` | `--color-status-danger` | ✓ |
| `--td-status-accent` | `--color-status-accent` | ✓ |
| `--td-status-neutral` | `--color-status-neutral` | ✓ |
| `--td-nav-shadow` | `--shadow-nav` | ✓ |
| `--td-font-ui` | `--font-sans` |  |
| `--td-font-code` | `--font-mono` |  |
| `--td-font-display` | `--font-display` |  |
| `--td-font-meta` | `--font-meta` |  |
| `--td-font-heading` | `--font-heading` |  |

## Tokens with no utility alias

These are read straight out of CSS or JS, so no class name reaches them. Setting the related `--color-*` does nothing for them.

- **Status emphasis** (6) — `--td-status-info-emphasis`, `--td-status-success-emphasis`, `--td-status-warning-emphasis`, `--td-status-danger-emphasis`, `--td-status-accent-emphasis`, `--td-status-neutral-emphasis`. Read by `callout.css`, `download.css`, `marker.css`. Each status carries two values: the plain one draws borders and icons, `-emphasis` draws text. They are separate because a hue tuned for a 1px border does not hold enough contrast as text on a pale fill. Recolour a status and you want both.
- **Layout metrics** (7) — `--td-nav-h`, `--td-shell-nav-h`, `--td-shell-sidebar-w`, `--td-shell-sidebar-min`, `--td-shell-sidebar-max`, `--td-shell-read-slim`, `--td-shell-read-normal`. Lengths, not colours. Some are re-declared in a media query, so the `:root` value is a default rather than a constant: `--td-shell-nav-h` at `print`, `--td-shell-sidebar-w` at `(width >= 64rem)`. Override them at the same breakpoint or the default wins there.
- **Font roles** (4) — `--td-font-platform-sans`, `--td-font-platform-mono`, `--td-font-body`, `--td-font-print`. The platform stacks are the fallback tail behind every other font role; keep them last in any list you write, since CJK, emoji, and glyphs missing from Inter render from there.

## Design constants

Declared in `@theme` rather than `:root`, and not tied to any `--td-*`. They do not change with the colour scheme.

| Token | Utility |
|---|---|
| `--leading-body` | `leading-*` |
| `--radius-code` | `rounded-*` |
| `--duration-fast` | `duration-*` |
| `--duration-base` | `duration-*` |
| `--duration-slow` | `duration-*` |
| `--ease-color` | `ease-*` |
| `--ease-collapse` | `ease-*` |
| `--ease-dialog` | `ease-*` |

The three `--duration-*` values are how `prefers-reduced-motion` is honoured: that media query zeroes all three instead of maintaining a per-selector list. If you add an animation, drive its duration from one of them and reduced motion works for free.

## Typography preset

`[data-td-typography="system"]` re-declares `--td-font-ui`, `--td-font-code`, `--td-font-display`, `--td-font-meta`, dropping the fonts the theme ships in favour of platform stacks. Both presets compile into one stylesheet with no runtime. Select it with `params.ui.typography` — see `params.md`.

## Two things that will not work

- **Do not edit `assets/dist/`.** It is generated; the next `pnpm css:build` overwrites it. Theme sources live in `src/css/`.
- **A token only JS reads does not belong in `@theme`.** Tailwind tree-shakes names that no class references, and `getComputedStyle` then returns an empty string. Put it in a plain `:root` block — which is where the `--td-*` layout metrics above already live.
