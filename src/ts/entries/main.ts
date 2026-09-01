// 主 bundle 入口。defer 加载，不阻塞首帧 —— 只有深浅色需要同步执行，
// 那部分在 entries/theme.ts。

import { init as initDrawer } from "../drawer.js";
import { init as initNavbar } from "../navbar.js";
import { init as initScrollRegion } from "../scroll-region.js";
import { init as initScrollSpy } from "../scroll-spy.js";
import { init as initSidebarNav } from "../sidebar-nav.js";

initDrawer();
initNavbar();
initScrollSpy();
initScrollRegion();
initSidebarNav();
