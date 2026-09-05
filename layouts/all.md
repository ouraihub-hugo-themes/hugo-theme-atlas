{{- /* Markdown 输出。一页一份，给抓取方与「复制本页原文」用。

     **用 `.RenderShortcodes`，不是 `.Content` 也不是 `.RawContent`。** 三者
     在这里的差别是这个模板成立与否：

       - `.Content` 走完 Goldmark，出来的是 HTML —— 那就不是 markdown 输出了。
       - `.RawContent` 是磁盘上的原文，shortcode 调用原样留着。抓取方看到的是
         一串 `cards`、`tabs` 那样的 shortcode 调用标记 —— 它不认识，而作者写在
         那些 shortcode 里的内容全部丢失。
       - `.RenderShortcodes` 展开 shortcode 但不渲染外层 Markdown —— 正好是
         「Markdown 进、Markdown 出」。

     shortcode 各自要知道自己在往哪种格式输出，否则展开出来的是 HTML 组件标记。
     那个开关是 `tdOutputFormat`。三件事都是实测定下来的：

       1. **必须在 `.RenderShortcodes` 之前设** —— 那一次调用就是 shortcode 求值
          的时刻，之后再设已经晚了。
       2. **必须在之后还原。** Store 是 Page 一级的，跨输出格式同一个页面共用；
          shortcode 每种格式各求值一次（实测：同一页两条 probe，一条 UNSET 一条
          markdown）。留着不还原的话，先渲 markdown 后渲 HTML 的那些页会把纯文本
          分支印进 HTML —— 而 Hugo 不保证输出格式的渲染顺序。
       3. 因此 `$body` 要先求值再还原：赋值那一步就是求值那一步。

     没有 `.Page.OutputFormat` 这种原生取法（实测：`can't evaluate field
     OutputFormat in type page.Page`），所以只能走 Store。 */ -}}
{{- .Store.Set "tdOutputFormat" "markdown" -}}
{{- /* `strings.TrimSpace` 会把 `.RenderShortcodes` 的 HTML 类型降成普通字符串，
       之后 `{{ $body }}` 就要过一遍 html/template 的转义器 —— 正文里写在反引号
       里的 `<strong>` 会印成 `&lt;strong&gt;`（实测）。`markdown` 输出格式的
       mediaType 是 text/markdown 而不是 isPlainText，所以转义器仍然在路上。

       TrimSpace 之后重新标一次 safeHTML：这里的内容本来就是作者的正文，
       转义它没有安全收益 —— HTML 输出那一侧同样原样交给浏览器。 */ -}}
{{- $body := safeHTML (strings.TrimSpace .RenderShortcodes) -}}
{{- .Store.Set "tdOutputFormat" "html" -}}
{{- /* Landing 页的内容全在 front matter 的 `sections:` 里，正文是空的 ——
       上面那次 .RenderShortcodes 什么都取不到，这一页的 markdown 输出就只剩
       一行标题（实测 13 字节）。把 section 的叙述文字摊平接在正文之前。

       只对 landing 布局做：别的页面正文就是内容，没有这个问题。 */ -}}
{{- if eq .Layout "landing" -}}
  {{- with partial "landing/as-markdown.html" . -}}
    {{- $body = safeHTML (printf "%s%s" . (cond (eq (printf "%s" $body) "") "" (printf "\n\n%s" $body))) -}}
  {{- end -}}
{{- end -}}
# {{ .Title }}

{{ with .Description }}> {{ . | plainify | chomp }}

{{ end -}}
{{- with $body }}
{{ . }}
{{ end -}}

{{- /* 列表页附上子页清单。单页没有 .Pages，这一段自然不出。 */ -}}
{{- with .Pages.ByWeight }}
{{ range . }}
- [{{ .LinkTitle }}]({{ with .OutputFormats.Get "markdown" }}{{ .Permalink }}{{ else }}{{ .Permalink }}{{ end }})
{{- with .Description }}: {{ . | plainify | chomp }}{{ end }}
{{- end }}
{{ end -}}
