// 数据图表运行时入口。独立 bundle 且开代码分割（见 scripts/build-ts.js）——
// 只在页面真有 ```echarts 围栏时加载，判断在 foot/js.html 读 Page Store 的
// hasChart。
//
// 这个入口本身一两 KB：echarts 核心与图种在图进视口时才 import，一篇只有折线图
// 的文档不下载关系图的代码。

import { init } from "../echarts.js";

init();
