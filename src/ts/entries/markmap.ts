// 思维导图运行时入口。独立 bundle 且开代码分割（见 scripts/build-ts.js）——
// 只在页面真有 {{< mindmap >}} 时加载，判断在 foot/js.html 读 Page Store 的
// hasMindmap。
//
// 这个入口本身一两 KB：markmap-view（77 KB）在图进视口时才 import。

import { init } from "../markmap.js";

init();
