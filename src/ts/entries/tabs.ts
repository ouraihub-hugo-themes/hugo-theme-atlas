// 标签页运行时入口。独立 bundle，只在页面真有标签页时加载 —— 判断在
// foot/js.html 读 Page Store 的 hasTabs。

import { init } from "../tabs.js";

init();
