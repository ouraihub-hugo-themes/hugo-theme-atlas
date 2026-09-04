# Landing sections

Generated from the landing section partials by `scripts/gen-skill-landing.js`. Do not edit by hand — `node scripts/gen-skill-landing.js --check` fails if this file drifts from them.

A landing page is **front matter, not body content.** There are no shortcodes here. The page is `layout: landing` plus a `sections:` array, and each entry's `type` picks the section.

```yaml
---
title: Home
layout: landing
sections:
  - type: hero
    headline: Ship documentation that stays correct
    tagline: Because the build will not tell you when it is not.
  - type: cards
    title: Start here
    items:
      - title: Install
        href: /docs/install/
---
```

**An unknown key warns and is ignored. A missing required key drops that item — or the whole section — while the build stays green.** Each section below states which.

**Every section also accepts** `type`, `id`, `tone`, `title`, `subtitle`, `eyebrow`.

`tone` is one of `plain`, `muted`, `accent`; anything else warns and falls back to `plain`. `title` and `subtitle` render Markdown; `eyebrow` is plain text.

Sections carrying `actions` take a list of buttons, each keyed `text`, `href`, `style`, `icon`. `style` is one of `primary`, `secondary`, `text`.

## Contents

- [bar-chart](#bar-chart) — Horizontal bars from label/value pairs. No chart runtime.
- [capabilities](#capabilities) — Feature list with a per-row status marker.
- [cards](#cards) — Grid of linked cards. Same markup as the `card` shortcode.
- [case-study](#case-study) — One narrative case with an image and its own metrics.
- [code-plate](#code-plate) — A single code sample presented as a section.
- [command-box](#command-box) — Copyable command lines.
- [contributors](#contributors) — Avatars from a data file.
- [cta](#cta) — A band of action buttons and nothing else.
- [download](#download) — Install instructions from a data file.
- [faq](#faq) — Question and answer pairs.
- [gallery](#gallery) — Image grid. Landing's own, unrelated to the `gallery` fence.
- [hero](#hero) — Page-opening headline block. One per page, first in the array.
- [logo-wall](#logo-wall) — Row of logos, optionally linked.
- [markdown](#markdown) — An escape hatch: a block of Markdown as its own section.
- [metrics](#metrics) — Big-number stats with labels.
- [preview](#preview) — One framed screenshot.
- [pricing](#pricing) — Plan cards with price, features, and actions.
- [pricing-compare](#pricing-compare) — Feature-by-plan comparison table.
- [principles](#principles) — Short titled statements with an icon. No links.
- [steps](#steps) — Numbered narrative steps. Landing's own, unrelated to `{.steps}` in content.
- [testimonials](#testimonials) — Pull quotes with attribution.
- [timeline](#timeline) — Dated entries in order, each with an optional status.

## bar-chart

Horizontal bars from label/value pairs. No chart runtime.

**Section keys:** `items`, `max`

**Each entry in `items`:** `label`, `value`, `display`

**Required per entry:** `label` — omit one and that entry is skipped.

**Also dropped when:**

- bar value must be a number — that entry only
- bar value must not be negative — that entry only

## capabilities

Feature list with a per-row status marker.

**Section keys:** `items`

**Each entry in `items`:** `title`, `status`, `note`

**Required per entry:** `title` — omit one and that entry is skipped.

## cards

Grid of linked cards. Same markup as the `card` shortcode.

**Section keys:** `items`

**Each entry in `items`:** `title`, `body`, `href`, `icon`, `badge`, `image`, `image_alt`

**Required per entry:** `title` — omit one and that entry is skipped.

## case-study

One narrative case with an image and its own metrics.

**Section keys:** `body`, `image`, `image_alt`, `metrics`, `actions`, `reverse`

**Required per entry:** `value`, `label` — omit one and that entry is skipped.

**Also dropped when:**

- each case-study metric must be a map — that entry only

## code-plate

A single code sample presented as a section.

**Section keys:** `body`, `code`, `lang`, `filename`, `actions`, `reverse`

**Required:** `code` — omit one and the whole section renders nothing.

## command-box

Copyable command lines.

**Section keys:** `commands`, `lang`, `note`

**Required:** `commands` — omit one and the whole section renders nothing.

## contributors

Avatars from a data file.

**Section keys:** `data`

**Also dropped when:**

- data must name one top-level data file — whole section
- data file %q was not found — whole section

**Needs a data file.** The `data` key names a top-level file under `data/`, defaulting to `data/contributors.yaml`. Without that file the section renders nothing.

## cta

A band of action buttons and nothing else.

**Section keys:** `actions`

## download

Install instructions from a data file.

**Section keys:** `data`

**Also dropped when:**

- download requires data naming one data/download/<key>.yaml — whole section

**Needs a data file.** The `data` key names a top-level file under `data/`, defaulting to `data/download.yaml`. Without that file the section renders nothing.

## faq

Question and answer pairs.

**Section keys:** `items`

**Each entry in `items`:** `question`, `answer`

**Required per entry:** `question`, `answer` — omit one and that entry is skipped.

## gallery

Image grid. Landing's own, unrelated to the `gallery` fence.

**Section keys:** `items`

**Each entry in `items`:** `src`, `alt`, `description`, `href`

**Required per entry:** `src`, `alt` — omit one and that entry is skipped.

## hero

Page-opening headline block. One per page, first in the array.

**Section keys:** `headline`, `tagline`, `image`, `actions`

## logo-wall

Row of logos, optionally linked.

**Section keys:** `items`

**Each entry in `items`:** `src`, `alt`, `href`

**Required per entry:** `src` — omit one and that entry is skipped.

**Also dropped when:**

- logo requires alt (the name is the whole point of this section) — that entry only

## markdown

An escape hatch: a block of Markdown as its own section.

**Section keys:** `body`

**Required:** `body` — omit one and the whole section renders nothing.

## metrics

Big-number stats with labels.

**Section keys:** `items`

**Each entry in `items`:** `value`, `label`, `note`

**Required per entry:** `value`, `label` — omit one and that entry is skipped.

## preview

One framed screenshot.

**Section keys:** `image`, `image_alt`, `caption`, `frame`

**Required:** `image` — omit one and the whole section renders nothing.

**Also dropped when:**

- preview requires image_alt (the image is the whole section) — whole section

## pricing

Plan cards with price, features, and actions.

**Section keys:** `items`

**Each entry in `items`:** `name`, `price`, `period`, `description`, `features`, `actions`, `featured`, `badge`

**Required per entry:** `name`, `price` — omit one and that entry is skipped.

## pricing-compare

Feature-by-plan comparison table.

**Section keys:** `plans`, `items`

**Each entry in `items`:** `feature`, `values`

**Required per entry:** `feature` — omit one and that entry is skipped.

**Also dropped when:**

- pricing-compare plans must be an array — whole section
- row values must be an array — that entry only
- a row's values count does not match the number of plans — that entry only

**Required:** `plans` — must be a non-empty array — an empty one counts as missing, and the whole section renders nothing.

## principles

Short titled statements with an icon. No links.

**Section keys:** `items`

**Each entry in `items`:** `title`, `body`, `icon`

**Required per entry:** `title`, `body` — omit one and that entry is skipped.

## steps

Numbered narrative steps. Landing's own, unrelated to `{.steps}` in content.

**Section keys:** `items`

**Each entry in `items`:** `title`, `body`

**Required per entry:** `title` — omit one and that entry is skipped.

## testimonials

Pull quotes with attribution.

**Section keys:** `items`

**Each entry in `items`:** `quote`, `name`, `role`, `avatar`

**Required per entry:** `quote`, `name` — omit one and that entry is skipped.

## timeline

Dated entries in order, each with an optional status.

**Section keys:** `items`

**Each entry in `items`:** `date`, `title`, `body`, `status`

**Required per entry:** `date`, `title` — omit one and that entry is skipped.
