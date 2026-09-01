---
title: filetree / gallery / checksums 的非法输入
expect:
  - 'filetree: title must not be empty'
  - 'filetree attributes: unknown attribute "depth"'
  - 'filetree: the fence requires tree entries'
  - 'filetree: line 2 dedents to an indentation level that was never opened'
  - 'filetree: line 1: unknown attribute "colour"'
  - 'filetree: line 2: attribute "tone" is set twice'
  - 'filetree: line 3: attribute "icon" must not be empty'
  - 'filetree: line 4: malformed attributes {icon=}'
  - 'filetree: line 5: unclosed attribute brace'
  - 'filetree: line 1: unknown icon "not-an-icon"'
  - 'filetree: line 2: tone must be one of'
  - 'filetree: line 3: type must be dir or file'
  - 'filetree: line 4: open must be true or false'
  - 'filetree: line 5: open is only valid on directories'
  - 'filetree: line 1 has no entry name'
  - 'filetree: unsupported link on line 2 scheme "javascript"'
  - 'gallery: the fence requires at least one image'
  - 'gallery: line 1 must start with a Markdown image'
  - 'gallery: line 2: unknown attribute "target"'
  - 'gallery: line 3: text after the image must start with #'
  - 'gallery: line 4: the description after # must not be empty'
  - 'gallery: line 5: class contains unsafe characters'
  - 'checksums: algo must be md5, sha1, sha256, or sha512'
  - 'checksums: group must be auto'
  - 'checksums: the fence requires checksum lines'
  - 'checksums: base must not be empty'
  - 'checksums: base must use http or https'
  - 'checksums: base URL must not contain a query or fragment'
  - 'checksums: base is required unless the page has release_url front matter'
---

空 title 与未知属性：

```filetree {title="" depth=2}
src/
```

空围栏：

```filetree
```

退到没开过的缩进层（第 2 行退了 2 格，而只开过 0 和 4）：

```filetree
    a/
  b
```

行内属性的四种错法：

第 3 行是显式的空值（`icon=""`），第 4 行的 `icon=` 连不上 pair 正则所以整段
算"写坏了"，第 5 行开了花括号没闭上：

```filetree
one {colour=red}
two {tone=info tone=danger}
three {icon=""}
four {icon=}
five {tone=info
```

属性值的五种错法（第 5 行是文件上写 open）：

```filetree
a {icon=not-an-icon}
b {tone=purple}
c {type=folder}
d/ {open=yes}
e.txt {open=false}
```

没有名字，以及不安全的链接：

链接地址里不能带括号 —— `[^)\s]+` 在第一个 `)` 就停，那是 Markdown 链接语法
本身的限制，不是这里的：

```filetree
# 只有注释
[x](javascript:void)
```

空图集：

```gallery
```

图集的五种错法：

```gallery
不是一张图
![a](a.png) {target=_blank}
![b](b.png) 没有井号
![c](c.png) #
![d](d.png) {class="a<b"}
```

checksums 的参数错法：

```checksums {algo=crc32 base="https://example.org/"}
a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90  x.tar.gz
```

```checksums {group=manual base="https://example.org/"}
a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90  x.tar.gz
```

```checksums {base="https://example.org/"}
```

```checksums {base=""}
a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90  x.tar.gz
```

```checksums {base="ftp://example.org/files/"}
a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90  x.tar.gz
```

```checksums {base="https://example.org/f/?v=1"}
a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90  x.tar.gz
```

没有 base 也没有 release_url：

```checksums
a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90  x.tar.gz
```
