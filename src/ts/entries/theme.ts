// <head> 同步加载。必须在首帧前设定主题属性，否则刷新会闪白。
// 副作用集中在 entry，模块本身只导出纯函数。
import { init } from "../theme-toggle.js";

init();
