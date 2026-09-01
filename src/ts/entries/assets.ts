// 资产表运行时入口。独立 bundle，只在页面真有资产表时加载 —— 加载判断在
// foot/js.html，标记由 release-assets shortcode 在渲染时写进 Page Store。

import { init } from "../assets.js";

init();
