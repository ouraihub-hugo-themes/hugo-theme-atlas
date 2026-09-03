/**
 * 进视口才挂载，只挂一次。
 *
 * 五个带外部 runtime 的组件（asciinema、echarts、markmap、mermaid、openapi）都要
 * 这一段：建观察器 → 进视口 → `unobserve` → 挂载。抽出来之前是各抄一份，五处
 * 一模一样只差 `rootMargin` 与那一行回调。
 *
 * `rootMargin` 是调用点的参数而不是这里的默认值：提前多远开始加载是每个 runtime
 * 自己的决定（录屏要点了才播，200px 就够；图要滚到跟前已经画好，400px；OpenAPI
 * 那一大块 600px），只是这个决定不该连观察器一起抄五遍。
 */

/**
 * 挂载一个宿主。
 *
 * 不带下标：五个调用点里只有 mermaid 要给图编号，它自己 `indexOf` 一次就够，
 * 而放进这里的话另外四个每次挂载都白算一次 O(n) 查找。
 */
export type Mount = (host: HTMLElement) => void;

/**
 * 给每个 host 挂一个一次性的进视口观察。
 *
 * hosts 为空时**不建观察器**直接返回：这是最常见的情形（大多数页面没有图表），
 * 建一个从不触发的 IntersectionObserver 是纯浪费。
 */
export function lazyMount(hosts: readonly HTMLElement[], rootMargin: string, mount: Mount): void {
  if (hosts.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // 先 unobserve 再挂载：挂载是异步的，重入时会拿到同一个 host 两次。
        observer.unobserve(entry.target);
        mount(entry.target as HTMLElement);
      }
    },
    { rootMargin },
  );
  for (const host of hosts) observer.observe(host);
}
