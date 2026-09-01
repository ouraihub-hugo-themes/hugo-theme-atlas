---
title: 校验和行的非法输入
description: 由 scripts/check-warnings.js 在临时站点里构建，不进 exampleSite。
expect:
  - 'release-assets line 1 must be <hex><two spaces><name> or <hex><space>*<name>'
  - 'release-assets line 2 filename must be one path segment'
  - 'release-assets line 3 has unsupported hex length 10'
  - 'release-assets mixes checksum algorithms'
  - 'is MD5 by length, which conflicts with algo="sha256"'
  - 'release-assets requires at least one checksum line'
---

坏行跳过而不是整段丢弃：一行手工粘错不该赔掉其余的。这一段里第四行是好的，
它该照常渲染出来。

{{< release-assets base="https://example.org/d" >}}
这一行既没有十六进制也没有两个空格
9f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8  sub/dir/a.tar.gz
0123456789  short-hex.tar.gz
1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809  good.tar.gz
{{< /release-assets >}}

一段里混用算法：表格每行显示自己的算法标签，混排看起来是对的，但"这一批文件的
校验和"这个说法就不成立了。

{{< release-assets base="https://example.org/d" >}}
1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809  sha256.tar.gz
9f1a2b3c4d5e6f708192a3b4c5d6e7f8  md5.tar.gz
{{< /release-assets >}}

声明了期望算法但长度不符。拿 md5 当 sha256 发布是真实存在的事故，所以这是一条
明确的警告而不是静默按长度改判：

{{< release-assets base="https://example.org/d" algo="sha256" >}}
9f1a2b3c4d5e6f708192a3b4c5d6e7f8  md5.tar.gz
{{< /release-assets >}}

一行都不剩时整段不渲染。空行与 `#` 注释行不算错误 —— `sha256sum` 的输出常带一行
说明头：

{{< release-assets base="https://example.org/d" >}}
# 这一行是注释

坏行
{{< /release-assets >}}
