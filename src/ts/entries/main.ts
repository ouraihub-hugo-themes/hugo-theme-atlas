// 主 bundle 入口。defer 加载，不阻塞首帧 —— 只有深浅色需要同步执行，
// 那部分在 entries/theme.ts。

import { init as initDrawer } from "../drawer.js";
import { init as initNavbar } from "../navbar.js";
import { init as initScrollRegion } from "../scroll-region.js";
import { init as initScrollSpy } from "../scroll-spy.js";
import { init as initSearch } from "../search.js";
import { init as initShare } from "../share.js";
import { init as initSidebarNav } from "../sidebar-nav.js";

initDrawer();
initNavbar();
initScrollSpy();
initScrollRegion();
initSidebarNav();
// 搜索进主 bundle 而不是自己一个入口：它只有对话框的开合与查询循环，pagefind
// 本体是运行时 `import()` 拉的，没建索引的站点一个字节都不下。给它单独一个
// 入口等于多一次请求换几行代码。
initSearch();
// 分享条只有「复制链接」要 JS，十几行 —— 与搜索同理，自己一个入口换来的是
// 多一次请求。
initShare();
