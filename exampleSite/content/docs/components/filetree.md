---
title: 目录树与图集
weight: 106
description: 两个数据围栏：一段 tree 输出，一列图片。
---

## 目录树

粘一段 `tree` 的输出就行，不用改形状：

```filetree {title="项目结构"}
.
├── layouts/
│   ├── _markup/            # render hook
│   ├── _partials/
│   │   └── content/        # 共享的内容设施
│   └── baseof.html
├── src/
│   ├── css/                # Tailwind 源
│   └── ts/                 # 浏览器运行时
├── go.mod {type=file}
└── theme.toml              # 主题元数据
```

手写的缩进列表也认，两种形状可以混：

```filetree
docs/
  guide.md          # 上手
  reference.md      # 参考
assets/
  dist/             # 编译产物，提交进仓库
```

图标按文件名与扩展名派。`tone` 给一条上色，`icon` 直接指定，`open=false` 让
一个目录默认收起：

```filetree
config/
  app.toml          # 配置
  secrets.env {tone=danger}    # 别提交这个
  ca.pem {icon=lock}
build/ {open=false}
  cache/            # 收起来了，点开看
    stale.log
```

条目名可以是链接：`[名字](地址)` —— 过的是共享 URL 策略，`javascript:` 这类
不会输出成链接。

```filetree
themes/
  atlas/
    [layouts](https://gohugo.io/templates/)
    [assets](https://gohugo.io/hugo-pipes/)
```

整段都没有注释时注释列根本不生成，名字铺满整行 —— 留一个空列会让每行右边
空掉三分之一。

## 图集

一行一张图。`![alt](src)` 之后可以跟 `{link=…}` 与 `# 说明`：

```gallery
![浅色主题](fixture-960x540.png) # 浅色
![深色主题](fixture-960x540.png) # 深色
![窄屏](fixture-960x540.png) # 抽屉展开
```

不写说明就是纯栅格：

```gallery
![一](fixture-960x540.png)
![二](fixture-960x540.png)
![三](fixture-960x540.png)
![四](fixture-960x540.png)
```

固有尺寸从图片资源读出来写进 `width`/`height`，所以图载入前不会把下面的内容
顶下去。`link=` 把图指到全尺寸原图 —— 没有点击放大的运行时，那要一个
lightbox，而一个链接已经够。

## 校验和

`checksums` 围栏是资产表的围栏形式：作者手里本来就是一段 `sha256sum` 的输出。

```checksums {base="https://example.org/releases/v0.1.0/"}
a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90  atlas-0.1.0-linux-amd64.tar.gz
b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1  atlas-0.1.0-darwin-arm64.tar.gz
```

`base` 与页面的 `release_url` 互斥：两者都给时不猜用哪个，整块跳过并警告 ——
选错的那一半指向不存在的文件，而它渲染出来跟对的一模一样。
