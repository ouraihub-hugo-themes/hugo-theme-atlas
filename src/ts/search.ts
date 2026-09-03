/**
 * 搜索运行时。建在 pagefind 的 JS API 上，不用它自带的 UI 组件。
 *
 * 不用默认组件的理由是样式：它带一份自己的 CSS，与主题的 `--td-*` token 是两套
 * 颜色系统，深浅色切换、forced-colors、RTL 都要各覆盖一遍 —— 覆盖一份陌生的
 * 样式表比写这一百多行难。JS API 只返回数据。
 *
 * **索引是消费方的构建步骤。** `hugo` 出站之后要跑 `npx pagefind --site public`，
 * 而 `hugo server` 下 `/pagefind/pagefind.js` 不存在。所以加载失败不是错误，
 * 是"这个站还没建索引"，给一句指向那一步的提示而不是抛异常。
 */

import { PAGEFIND_PATH, type Pagefind, type PagefindResult } from "./search-api.js";

/** 结果上限。超过这个数的部分读者不会看，而每条都要一次 `data()` 网络往返。 */
const MAX_RESULTS = 12;

/** 每条结果最多展开几个 sub_result（按标题分节的锚点）。 */
const MAX_SUB = 3;

/** 打字防抖。pagefind 自带 `debouncedSearch`，这个值传给它。 */
const DEBOUNCE_MS = 180;

interface Refs {
  dialog: HTMLDialogElement;
  input: HTMLInputElement;
  status: HTMLElement;
  results: HTMLElement;
  form: HTMLFormElement;
}

/** 状态区的四句文案。缺属性时回落英文 —— 与 scroll-region 的做法一致。 */
interface Strings {
  many: string;
  one: string;
  none: string;
  unavailable: string;
}

function strings(status: HTMLElement): Strings {
  const d = status.dataset;
  return {
    many: d.tdSearchMany ?? "%d results",
    one: d.tdSearchOne ?? "1 result",
    none: d.tdSearchNone ?? "No results",
    unavailable: d.tdSearchUnavailable ?? "Search index not found. Run pagefind after building.",
  };
}

/**
 * 懒加载 pagefind，只加载一次。
 *
 * 路径必须经过一个变量。写成字面量的话 esbuild 会在构建时去解析
 * `/pagefind/pagefind.js` 并报找不到 —— 那个文件是消费方跑 pagefind 之后才
 * 存在的运行时资源，不是构建输入。
 */
let loading: Promise<Pagefind | null> | undefined;

function load(): Promise<Pagefind | null> {
  loading ??= (async () => {
    try {
      const path = PAGEFIND_PATH;
      const mod = (await import(path)) as Pagefind;
      await mod.init();
      return mod;
    } catch {
      // 没建索引就是这一条路径。不 rethrow：搜索框仍然可用（能打字、能关闭），
      // 只是给一句提示 —— 抛出去会让整个 main bundle 的后续初始化中断。
      return null;
    }
  })();
  return loading;
}

/** `stripToMarks` 要的那点接口。抽成类型是为了让测试能喂一棵手写的树。 */
export interface MarkStrippable {
  tagName: string;
  childNodes: ArrayLike<unknown>;
  replaceWith(...nodes: unknown[]): void;
  getAttributeNames(): string[];
  removeAttribute(name: string): void;
}

/**
 * 只留 `<mark>`，且只留它的标签 —— 属性一个不留。
 *
 * 两件事分开说，因为第二件曾经漏掉：拆非-mark 元素时属性是**跟着元素一起消失**
 * 的，是副作用不是处理；活下来的 `<mark>` 原来会原样保留它带来的一切，包括
 * `onclick`。实测过那种 mark 的处理器真的会触发。
 *
 * 用 `getAttributeNames()` 而不是遍历 `attributes`：后者是实时集合，边遍历边删
 * 会隔一个漏一个。
 */
export function stripToMarks(elements: Iterable<MarkStrippable>): void {
  for (const el of elements) {
    if (el.tagName !== "MARK") {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    for (const name of el.getAttributeNames()) el.removeAttribute(name);
  }
}

/**
 * 把 pagefind 的 excerpt 放进一个元素。
 *
 * **excerpt 里有 `<mark>`，而且只可能有 `<mark>`。** pagefind 对正文做了转义
 * （核实过：建索引后查词，excerpt 里出现的标签只有 mark，正文的 `<` 是 `&lt;`），
 * 高亮标签是它自己加的。所以这里用 `innerHTML` 是安全的 —— 但安全依赖于"只有
 * mark"这个前提，所以过一道 `<template>`：前提万一变了（pagefind 换了标记、或者
 * 某个站点的正文里真的有未转义的东西），代价是少一层高亮，不是一个注入点。
 *
 * `<template>` 这一层不只是为了拿解析器：它的内容属于一份惰性文档，脚本不执行、
 * 资源不请求，所以清洗发生在任何副作用之前而不是之后。
 */
function setExcerpt(target: HTMLElement, excerpt: string): void {
  const tpl = document.createElement("template");
  tpl.innerHTML = excerpt;
  stripToMarks(tpl.content.querySelectorAll("*"));
  target.replaceChildren(tpl.content);
}

/** 一条结果（页面级）。sub_results 作为嵌套列表挂在它下面。 */
function renderResult(data: Awaited<ReturnType<PagefindResult["data"]>>): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "td-search-result";

  const link = document.createElement("a");
  link.className = "td-search-result-link";
  link.href = data.url;
  link.textContent = data.meta.title ?? data.url;
  li.append(link);

  const subs = (data.sub_results ?? []).filter((s) => s.url !== data.url).slice(0, MAX_SUB);

  // 有 sub_result 时页面级的 excerpt 不再显示：那段文字与第一个 sub_result 的
  // 高度重合，两份并排读起来像同一句话出现了两次。
  if (subs.length === 0) {
    const p = document.createElement("p");
    p.className = "td-search-excerpt";
    setExcerpt(p, data.excerpt);
    li.append(p);
    return li;
  }

  const list = document.createElement("ol");
  list.className = "td-search-subs";
  for (const sub of subs) {
    const item = document.createElement("li");
    const a = document.createElement("a");
    a.className = "td-search-sub-link";
    a.href = sub.url;
    a.textContent = sub.title;
    const p = document.createElement("p");
    p.className = "td-search-excerpt";
    setExcerpt(p, sub.excerpt);
    item.append(a, p);
    list.append(item);
  }
  li.append(list);
  return li;
}

/**
 * 跑一次查询并渲染。
 *
 * `debouncedSearch` 在有更新的查询发出后返回 null，那时直接退出 —— 不清空结果，
 * 因为更新的那次马上会写进来，中间清一次会让列表闪一下。
 */
async function run(refs: Refs, text: Strings, term: string): Promise<void> {
  if (term === "") {
    refs.results.replaceChildren();
    refs.status.textContent = "";
    return;
  }

  const pf = await load();
  if (!pf) {
    refs.results.replaceChildren();
    refs.status.textContent = text.unavailable;
    return;
  }

  const search = await pf.debouncedSearch(term, undefined, DEBOUNCE_MS);
  if (search === null) return;

  // 输入框在等待期间可能又变了。拿当前值比一次，避免把过期结果写上去 ——
  // debouncedSearch 只保证"更新的查询会让旧的返回 null"，而 data() 那一批
  // 网络往返发生在它之后。
  if (refs.input.value.trim() !== term) return;

  const top = search.results.slice(0, MAX_RESULTS);
  const data = await Promise.all(top.map((r) => r.data()));
  if (refs.input.value.trim() !== term) return;

  refs.results.replaceChildren(...data.map(renderResult));
  refs.status.textContent =
    data.length === 0
      ? text.none
      : data.length === 1
        ? text.one
        : text.many.replace("%d", String(data.length));
}

/**
 * 搜索对话框。
 *
 * `/` 打开：这是文档站的通行约定，而且它不与浏览器快捷键冲突。在输入框或
 * contenteditable 里按 `/` 不拦 —— 那时读者是在打字。
 */
export function init(): void {
  const dialog = document.querySelector<HTMLDialogElement>("[data-td-search]");
  if (!dialog) return;

  const input = dialog.querySelector<HTMLInputElement>("[data-td-search-input]");
  const status = dialog.querySelector<HTMLElement>("[data-td-search-status]");
  const results = dialog.querySelector<HTMLElement>("[data-td-search-results]");
  const form = dialog.querySelector<HTMLFormElement>("[data-td-search-form]");
  if (!input || !status || !results || !form) return;

  const refs: Refs = { dialog, input, status, results, form };
  const text = strings(status);

  // 结果就在输入框下面，提交没有去处。拦下来而不是去掉 `<form>`：包一层表单
  // 才有 Enter 的语义，也才有搜索框在移动端键盘上那个"搜索"确认键。
  form.addEventListener("submit", (e) => e.preventDefault());

  input.addEventListener("input", () => {
    void run(refs, text, input.value.trim());
  });

  const open = (): void => {
    if (dialog.open) return;
    dialog.showModal();
    input.focus();
    // 预热：读者点开搜索框的下一步几乎一定是打字，这时把索引拉下来能省掉
    // 第一次查询的等待。失败也无所谓，run() 会再走一次同一个 promise。
    void load();
  };

  // 点亮打开按钮。模板给它写了 `hidden`：搜索整个依赖 JS，这个 bundle 没跑到
  // 这一行的话，那个按钮就该一直是藏着的。
  for (const el of document.querySelectorAll<HTMLElement>("[data-td-search-open]")) {
    el.hidden = false;
    el.addEventListener("click", open);
  }
  for (const el of dialog.querySelectorAll("[data-td-search-close]")) {
    el.addEventListener("click", () => dialog.close());
  }

  // 点 backdrop 关闭。`<dialog>` 的点击目标是 dialog 本身时说明点在了它的
  // padding 之外，也就是 backdrop 上 —— 内容都在子元素里。
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  // Escape 自己接。`<input type="search">` 把 Escape 当"清空输入框"用，并且
  // 消费掉它不再上传 —— 于是焦点在输入框里（也就是刚打开的默认状态）时读者要
  // 按两次才能关掉：第一次清空，第二次才轮到 <dialog> 的原生关闭。实测过。
  // `preventDefault` 保住输入框的内容：重新打开时词和结果都还在，与"关掉又
  // 想起来"这个动作一致，也让状态行不会与一个空输入框对不上。
  dialog.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    dialog.close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement ||
      (active instanceof HTMLElement && active.isContentEditable)
    ) {
      return;
    }
    e.preventDefault();
    open();
  });
}
