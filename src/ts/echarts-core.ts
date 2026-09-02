/**
 * echarts 核心 + 所有图都要的组件，一个模块。
 *
 * **合成一个模块是为了减少请求数，不是为了图省事。** 分成四个 `import()` 时
 * esbuild 按每个 import 边界切，再把它们的公共代码抽成一堆匿名 chunk —— 一张
 * 折线图要发 37 个请求，其中 34 个是几百字节到十几 KB 的碎片。合到一个边界上，
 * 核心成一个 chunk，图种各自一个。
 *
 * 字节数不变（该下的代码一样多），变的是请求数与瀑布深度：碎片之间有依赖关系，
 * 浏览器要一层层解析出下一层的 URL 才能发下一批请求。
 */

import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

// 这三个组件所有图都可能用到，跟核心一起走：标题、提示框、图例。
// import 即注册（这些模块自己调 use()）。
import "echarts/lib/component/title";
import "echarts/lib/component/tooltip";
import "echarts/lib/component/legend";

// 直角坐标系也在核心里。八种图有四种（折线、柱、散点、热力）要它，而它自己
// 只有 0.5 KB —— 单独成一个 chunk 的话，那四种图各多发一个请求去取半 KB。
import "echarts/lib/component/grid";

// canvas 而不是 svg：热力图与散点图上千个点时 SVG 的 DOM 节点数会让滚动掉帧。
// 图表是数据展示，不需要 SVG 的可选中与可缩放。
echarts.use([CanvasRenderer]);

export { echarts };
