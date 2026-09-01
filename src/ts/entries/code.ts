// 代码块运行时入口。独立 bundle，只在页面真有需要复制或折叠的代码块时加载
// —— 一篇没有代码的文档不该为它付流量。加载判断在 foot/js.html。

import { init } from "../code.js";

init();
