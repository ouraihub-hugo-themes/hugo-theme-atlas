// OpenAPI 渲染器入口。只在页面真有 {{< swagger >}} 或 {{< redoc >}} 且 runtime
// 配好时加载，判断在 foot/js.html 读 Page Store 的 hasOpenapi。
//
// 不开代码分割：这个 bundle 本身两三 KB，重的那一兆多在作者配的地址上，由它自己
// 在容器进视口时去取。

import { init } from "../openapi.js";

init();
