// 深浅色。必须在首帧前跑完，否则刷新时会闪一下白。
// 因此这个文件单独成 entry，在 <head> 里同步加载，不与主 bundle 合并。

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "td-theme";
const ATTR = "data-td-theme";

export function readChoice(store: Pick<Storage, "getItem"> = localStorage): ThemeChoice {
  const raw = store.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function resolve(choice: ThemeChoice, prefersDark: boolean): "light" | "dark" {
  if (choice === "system") return prefersDark ? "dark" : "light";
  return choice;
}

export function apply(theme: "light" | "dark", root: HTMLElement = document.documentElement): void {
  root.setAttribute(ATTR, theme);
}

export function store(choice: ThemeChoice, s: Pick<Storage, "setItem" | "removeItem"> = localStorage): void {
  if (choice === "system") s.removeItem(STORAGE_KEY);
  else s.setItem(STORAGE_KEY, choice);
}

// 首帧前执行。DOM 尚未就绪，只碰 documentElement。
export function init(): void {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const choice = readChoice();
  apply(resolve(choice, query.matches));

  // 跟随系统：仅当用户选的是 system。
  query.addEventListener("change", (e) => {
    if (readChoice() === "system") apply(e.matches ? "dark" : "light");
  });

  // 切换按钮在 DOM 里，等它就绪。
  document.addEventListener("DOMContentLoaded", () => {
    for (const el of document.querySelectorAll<HTMLElement>("[data-td-theme-toggle]")) {
      el.addEventListener("click", () => {
        const next = document.documentElement.getAttribute(ATTR) === "dark" ? "light" : "dark";
        store(next);
        apply(next);
      });
    }
  });
}

// 这个模块只导出函数，副作用由 entries/theme.ts 触发 —— 单测可以自由
// import 而不会碰 DOM。
