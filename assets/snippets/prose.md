这段 Markdown 来自 `assets/snippets/prose.md`，走的是解析顺序的第二档
（`resources.Get`，assets 挂载点）。

它在引用它的页面上下文里渲染，所以：

- 列表、强调、`行内代码` 都正常
- render hook 也正常 —— 下面这个围栏带复制按钮和文件名标题栏

```js {filename="来自 assets 的围栏"}
// 引入的 Markdown 本身可以带围栏。外层围栏的长度是按内容算出来的，
// 固定三个反引号会在这里截断。
export const nested = true;
```
