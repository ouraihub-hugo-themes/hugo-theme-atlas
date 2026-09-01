// Mermaid 运行时入口。独立 bundle 且开代码分割（见 scripts/build-ts.js）——
// 只在页面真有 mermaid 围栏时加载，判断在 foot/js.html 读 Page Store 的
// hasMermaid。
//
// 这个入口本身只有 1.4 KB：mermaid 本体在图进视口时才 import。

import { init } from "../mermaid.js";

init();
