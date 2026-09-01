---
title: 排版
type: docs
description: 覆盖 Markdown 全部基础元素，用来核对正文观感。
---

正文段落。行高 1.7，字号继承根节点。这段文字用来看**粗体**、*斜体*、
`行内代码` 和[链接](https://example.org/)在同一行里的相对重量。

## 二级标题

标题用 display 字族（Chakra Petch），正文用 sans（Inter）。两个字族分工，
标题的辨识度不靠加大字号堆出来。

### 三级标题

三级标题回到 sans 字族，只靠字重和字号区分。

## 列表

- 无序列表第一项
- 第二项，带一段更长的文字用来看换行后的缩进对不对
  - 嵌套项
- 第三项

1. 有序列表
2. 第二项
3. 第三项

## 代码块

```ts
export function resolve(choice: ThemeChoice, prefersDark: boolean): "light" | "dark" {
  if (choice === "system") return prefersDark ? "dark" : "light";
  return choice;
}
```

## 引用

> 引用块。左边框用 accent 色，文字用 muted 墨色。
> 第二行确认多行引用的行高。

## 表格

| 层 | 内容 | 可否运行时改写 |
|---|---|---|
| 调色板 | `--td-canvas` 等 | 是（深色、主题色） |
| 运行时几何 | `--td-shell-sidebar-w` | 是（JS 拖拽） |
| `@theme inline` | 映射进 utility | 否 |
| `@theme` | 字体、动效曲线 | 否 |
