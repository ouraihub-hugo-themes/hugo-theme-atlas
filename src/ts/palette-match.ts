/**
 * 面板的匹配与排序。纯函数，不碰 DOM —— 所以单测直接喂字符串。
 *
 * **不做模糊匹配。** 子序列匹配（`tp` 命中 "Toggle... Print"）在一份十几条的
 * 固定列表上只会制造意外命中：条目少，读者敲两三个字母就到了，而模糊匹配让
 * "pr" 同时命中 print 与 repository 并且分不出哪个该在前。
 *
 * 分档而不是打分：
 *
 *   3  整个词从开头命中（"pri" → "Print this page"）
 *   2  某个词从开头命中（"page" → "Print this **page**"）
 *   1  出现在任意位置（"int" → "Pr**int**"）
 *   0  不命中
 *
 * 同档内按原顺序 —— 那个顺序是模板里写的，按常用程度排过。
 */

/** 大小写与全角/半角归一。NFKC 让「Ｐ」与「P」同一个。 */
export function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
}

export function tier(label: string, query: string): 0 | 1 | 2 | 3 {
  const needle = normalize(query);
  if (needle === "") return 3;
  const hay = normalize(label);
  if (hay.startsWith(needle)) return 3;
  // 词首命中。按空格切而不是用 `\b`：`\b` 在 CJK 上到处都是边界，于是
  // 「这一页」里任何一个字都算词首，第 2 档就等于第 1 档。
  if (hay.split(" ").some((word) => word.startsWith(needle))) return 2;
  return hay.includes(needle) ? 1 : 0;
}

/**
 * 按档排序并丢掉不命中的。索引一起带出来 —— 调用方要按它把 DOM 节点排回去。
 *
 * `sort` 在现代引擎里是稳定的（ES2019 起是规范要求），所以同档内的原顺序
 * 自然保住，不必把索引也编进比较函数。
 */
export function rank(labels: readonly string[], query: string): number[] {
  return labels
    .map((label, index) => ({ index, t: tier(label, query) }))
    .filter((row) => row.t > 0)
    .sort((a, b) => b.t - a.t)
    .map((row) => row.index);
}
