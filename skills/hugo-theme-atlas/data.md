# Data files

Generated from the partials that read them by `scripts/gen-skill-data.js`. Do not edit by hand — `node scripts/gen-skill-data.js --check` fails if this file drifts from them.

Two components render **nothing at all** without a data file, and nothing with the wrong keys. The build stays green either way. Measured: an agent told to build a site got the file paths right and the field names wrong, and the sections silently vanished.

## data/contributors.yaml

Used by the `contributors` shortcode and the `contributors` landing section.

**The entries go under an `items:` key.** A file that lists them at the top level warns `requires items; listing no contributors` and renders an empty wall.

```yaml
items:
  - github: gohugoio # required
    name: Hugo # optional, defaults to the handle
    role: Static site generator # optional, hidden when absent
    url: https://gohugo.io/ # optional, defaults to the GitHub profile
    avatar: https://example.org/a.png # optional, defaults to an initial placeholder
```

Per-entry keys: `github`, `name`, `role`, `url`, `avatar`. Only `github` is required, and it must look like
a GitHub handle — a bad one skips that entry and keeps the rest. The theme makes no network call: avatars come from this file.

A different filename works — `{{< contributors data="maintainers" >}}` reads
`data/maintainers.yaml` — but the key must be a single top-level name, no slashes.

## data/download/&lt;key&gt;.yaml

Used by the `download` shortcode and the `download` landing section. The key is the
filename, and it must match `^[a-z0-9][a-z0-9_-]*$`.

**Top-level fields:** `version`, `repo`, `tag`, `published`, `channels` — anything else skips the whole block.
`version` and `channels` are required; `channels` must be a non-empty array.
`repo` is an `owner/repository` pair. `tag` defaults to `v` plus the version.

**Per-channel fields:** `id`, `kind`, `icon`, `url`, `steps`, `checksums`, `checksums_src`

`kind` is one of `rolling`, `pinned` and is what decides whether interpolation is allowed:

- `pinned` points at one specific version, so `${version}` and `${tag}` expand inside `steps[].code`.
- `rolling` follows the latest release, so interpolation is refused — writing a fixed version into an “install the latest” command contradicts itself.

`title` and `note` may never interpolate version facts, in any kind.

**Per-step fields:** `code`, `lang`, plus `title` and `title_<lang>` variants.

```yaml
version: "0.1.0"
repo: owner/repository
channels:
  - id: tarball
    kind: pinned
    title: Source tarball
    icon: box
    steps:
      - title: Download
        lang: shell
        code: curl -LO https://example.org/${tag}.tar.gz
```

Every one of these fields is validated. A bad value skips its own scope — the step, the
channel, or the whole block — and warns. None of it fails the build.
