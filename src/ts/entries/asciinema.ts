// 终端录屏运行时入口。独立 bundle 且开代码分割（见 scripts/build-ts.js）——
// 只在页面真有 {{< cast >}} 时加载，判断在 foot/js.html 读 Page Store 的
// hasCast。
//
// 这个入口本身只有约 1 KB：播放器本体（184 KB）在录屏进视口时才 import。

import { init } from "../asciinema.js";

init();
