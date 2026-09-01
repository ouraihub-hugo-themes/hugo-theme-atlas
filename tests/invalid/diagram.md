---
title: mermaid / goat 的非法输入
expect:
  - 'mermaid: the fence requires a diagram'
  - 'mermaid attributes: unknown attribute "theme"'
  - 'mermaid: id requires num'
  - 'goat: the fence requires a diagram'
  - 'goat: full-width characters overlap in the character grid'
  - 'goat: id requires num'
---

空围栏：

```mermaid
```

```goat
```

未知属性 —— `theme` 不开放给作者：一页里两张图各用一套配色只会让读者以为
它们在表达不同的东西。

```mermaid {theme=forest}
graph TD
    A --> B
```

`id` 不带 `num`：`id` 是编号目标的属性，没有编号就没有可引用的东西。

```mermaid {id="x"}
graph TD
    A --> B
```

```goat {id="y"}
.---.
| A |
'---'
```

goat 里写全宽字符：格子是 8px 一列，而一个汉字渲染出来 13.33px，每个字都会
压住右边那个。**照画不跳过** —— 线框部分仍然是对的，作者一眼看得出是标签的
问题；跳掉整块只会得到一个"我的图没了"。

```goat
.--------.
| 中文标签 |
'--------'
```
