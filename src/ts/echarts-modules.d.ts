// echarts 只为顶层入口（core、charts、components…）出类型，`lib/` 下的按需模块
// 没有 .d.ts。这些 import 是纯副作用（模块自己调 use() 注册），拿不到导出也不用
// 拿 —— 声明成空模块即可，比给每个写一份手抄类型省事，也不会写错。
declare module "echarts/lib/chart/*";
declare module "echarts/lib/component/*";
