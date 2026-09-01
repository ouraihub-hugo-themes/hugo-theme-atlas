/**
 * 侧栏折叠状态的持久化。
 *
 * 服务端已经按读者的位置渲染好初始状态：祖先链上的 section 带 open，其余
 * 收起。没有 JS 时这份状态就是全部 —— 原生 <details> 自己会折叠，只是翻页
 * 后回到服务端那份。
 *
 * 这里存的是"读者手动展开过哪些"，而且只加不减：恢复时只打开，绝不关闭。
 * 原因是服务端每翻一页都会重新展开当前所在的那条链，如果让存储覆盖它，读者
 * 正在读的 section 会在导航后自己收起来 —— 人就找不到自己在哪了。所以读者
 * 在祖先链上的"关"不跨页保留，非祖先链上的 section 本来就是收起的，"关"表现
 * 为从集合里移除，自然生效。
 */

const STORAGE_KEY = "td-sidebar-open";

/**
 * 解析存下来的键集合。localStorage 是外部输入 —— 可能是别的脚本写的、可能
 * 是旧版本的格式、可能被手改过，任何一种坏数据都不该让侧栏罢工。
 */
export function parseKeys(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function read(): Set<string> {
  try {
    return new Set(parseKeys(localStorage.getItem(STORAGE_KEY)));
  } catch {
    // Safari 隐私模式下 localStorage 会抛，不是返回 null。
    return new Set();
  }
}

function write(keys: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // 配额满或被禁用。折叠状态只是偏好，丢了不影响功能。
  }
}

export function init(doc: Document = document): void {
  const nodes = [...doc.querySelectorAll<HTMLDetailsElement>("[data-td-nav-key]")];
  if (nodes.length === 0) return;

  // ponytail: 键随站点里 section 的数量增长，重命名会留下死键。总量是几百
  // 字节，且侧栏只渲染当前顶层 section 的子树，照 DOM 清理会误删别的分支 ——
  // 等它真的大到有影响再说。
  const open = read();

  for (const node of nodes) {
    const key = node.dataset.tdNavKey;
    if (!key) continue;
    if (open.has(key)) node.open = true;

    node.addEventListener("toggle", () => {
      if (node.open) open.add(key);
      else open.delete(key);
      write(open);
    });
  }
}
