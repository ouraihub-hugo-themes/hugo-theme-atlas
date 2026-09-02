/**
 * pagefind 的类型与常量。
 *
 * 单独一个文件是因为两个消费方：`search.ts`（搜索对话框）与后面的命令面板都要
 * 查同一个索引，而类型定义抄两份意味着 pagefind 换版本时改一处漏一处。
 *
 * **不装 `@types/pagefind`。** 这里用到的是它 API 的一个很窄的切片（init、
 * debouncedSearch、结果的 data()），而那个包要跟着 pagefind 的版本走。手写这
 * 几个接口的代价是几十行，收益是它们描述的正好是本主题用到的部分 —— 用到没
 * 声明的字段时编译器会说，而不是从一份大得多的声明里默默拿到一个我没验证过的
 * 字段。
 */

/**
 * 索引的位置。pagefind 把产物放在站点根的 `/pagefind/` 下。
 *
 * 路径不做成参数：pagefind CLI 的 `--output-subdir` 能改它，但改了之后消费方
 * 的构建命令与主题配置必须同时改对，而错配的表现是搜索静默不可用。让它固定在
 * 默认值上，少一处能错的地方。
 */
export const PAGEFIND_PATH = "/pagefind/pagefind.js";

/** 一条结果里按标题分出的子命中。`anchor` 有值时 url 带 `#`。 */
export interface PagefindSubResult {
  title: string;
  url: string;
  excerpt: string;
}

/** `result.data()` 的返回。只声明用到的字段。 */
export interface PagefindData {
  url: string;
  excerpt: string;
  meta: { title?: string };
  sub_results?: PagefindSubResult[];
}

export interface PagefindResult {
  id: string;
  score: number;
  data: () => Promise<PagefindData>;
}

export interface PagefindSearch {
  results: PagefindResult[];
}

export interface Pagefind {
  init: () => Promise<void>;
  /** 一个更新的查询发出后，旧的那次返回 null。 */
  debouncedSearch: (
    term: string,
    options?: Record<string, unknown>,
    debounceMs?: number,
  ) => Promise<PagefindSearch | null>;
}
