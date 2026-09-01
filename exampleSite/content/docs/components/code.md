---
title: 代码块
weight: 40
description: 文件名标题栏、复制、折叠、软换行、行号。
---

普通围栏。高亮交给 Hugo 的 `transform.Highlight` —— 行号、高亮行、起始行号都是
它的 options，主题不重新实现。

```go
func main() {
	fmt.Println("hello")
}
```

## 文件名

`filename` 加一条标题栏。长路径截断而不是把按钮挤出去。

```yaml {filename="config/production/very/long/path/to/settings.yaml"}
server:
  port: 8080
  host: 0.0.0.0
```

## 复制

默认开。按钮在标题栏右侧；没有文件名时它自己靠右。

复制取 `<pre>` 的 `textContent` 而不是 `innerText` —— 后者受 CSS 影响，软换行
开启时会把折行位置当成真换行插进去，复制出来的命令就断了。

```sh
hugo --source exampleSite --themesDir ../.. --printPathWarnings --panicOnWarning
```

关掉：

```sh {copy=false}
echo "这个块没有复制按钮"
```

## 软换行

`wrap` 让长行折行而不是横向滚。

```sh {wrap=true}
psql -h localhost -p 5432 -U postgres -d mydb -c "SELECT id, created_at, updated_at, payload, status FROM events WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100;"
```

## 行号

行号走围栏本身的语法，不经过属性策略。

```python {lineNos=true}
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

`lineNos=table` 与 `wrap` 互斥 —— 表格布局把每行放进单元格，折行会让行号与
代码错位。模板检测到这个组合会 warn 并关掉 wrap。

## 高亮行

```js {lineNos=true hl_lines="2-3"}
const routes = [
  { path: "/", component: Home },
  { path: "/about", component: About },
  { path: "/docs", component: Docs },
];
```

## 折叠

`collapse` 接受布尔或正整数：`true` 用默认阈值 20 行，数字给自定义阈值。
只有超过阈值才真的折叠 —— 一个 5 行的块加折叠按钮是纯噪音。

折叠高度由运行时按实际行高算，不在构建时算：等宽字体载入前后行高不同，写死的
像素值会在字体切换时错位。

```json {collapse=8 filename="package.json"}
{
  "name": "hugo-theme-atlas",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently -n CSS,TS,HUGO",
    "build": "pnpm css:build && pnpm ts:build",
    "check": "pnpm type-check && pnpm lint && pnpm test:run",
    "css:build": "tailwindcss -i src/css/main.css -o assets/dist/main.css --minify",
    "ts:build": "node scripts/build-ts.js --minify",
    "icons:build": "node scripts/build-icons.js",
    "lint": "eslint src/ts && stylelint \"src/css/**/*.css\"",
    "test": "vitest"
  },
  "devDependencies": {
    "@fortawesome/fontawesome-free": "7.3.1",
    "esbuild": "0.28.2",
    "tailwindcss": "4.3.3",
    "typescript": "5.9.3",
    "vitest": "4.1.11"
  }
}
```

不到阈值就不折叠：

```sh {collapse=20}
echo "三行"
echo "不到二十行"
echo "不折叠"
```

## 无 JS

复制与折叠都是渐进增强。折叠按钮带 `hidden`，由运行时摘掉 —— 没有 JS 时代码块
完整展开，一个点不动的按钮比多出几行代码更糟。
