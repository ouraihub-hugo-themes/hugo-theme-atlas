/**
 * 页面反馈的两个按钮。
 *
 * **这里不发网络请求。** 一次点击派发一个 `td:feedback` 事件，站点自己那套
 * 统计接住它 —— 主题不装统计脚本，也就不该替站点选一家。
 *
 * localStorage 记住已答过：同一页刷新回来时按钮已按下、结果区已展开。这是
 * 便利不是提交门槛，所以存储失败（隐私模式、配额满）不阻止派发事件 ——
 * 反过来的话读者点了、统计收到了、界面却还是未答状态。
 */

/** 存储键带版本号：答案的形状以后变了，旧值不会被当成新形状读。 */
const PREFIX = "td-feedback:v1:";

type Answer = "helpful" | "not_helpful";

/** 事件 detail。站点的监听器读这三个字段。 */
export interface FeedbackDetail {
  result: Answer;
  page: string;
  language: string;
}

/**
 * 认一个存下来的答案，认不出就当没答过。
 *
 * 白名单而不是「非空就算」：localStorage 里的东西可能来自上一个版本的主题、
 * 来自同域下另一个站点，或者被人手改过。收下一个不认识的值的表现是 `render()`
 * 把两个按钮都置成未选中却又都禁用 —— 一个既没答案又不能答的状态。
 *
 * 导出是为了单测能钉住这个白名单，`init()` 不从外面拿它。
 */
export function readAnswer(store: Pick<Storage, "getItem">, key: string): Answer | null {
  try {
    const raw = store.getItem(key);
    return raw === "helpful" || raw === "not_helpful" ? raw : null;
  } catch {
    // 隐私模式下 getItem 本身会抛。
    return null;
  }
}

function write(key: string, value: Answer | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 存不下就算了，见上面的注释。
  }
}

function initRoot(root: HTMLElement): void {
  const result = root.querySelector<HTMLElement>("[data-td-feedback-result]");
  const change = root.querySelector<HTMLElement>("[data-td-feedback-change]");
  const issue = root.querySelector<HTMLElement>("[data-td-feedback-issue]");
  const choices = [...root.querySelectorAll<HTMLButtonElement>("[data-td-feedback-choice]")];
  // 解构成局部常量而不是直接用上面那些：`render` 是闭包，TypeScript 证明不了
  // 那时 `result` 还非空，而 `choices[0]` 在开了 noUncheckedIndexedAccess 之后
  // 也是可选的 —— 长度已经判过两个了，但那个判断跨不过索引访问。
  const [first, second] = choices;
  if (!result || !change || !first || !second) return;

  const page = root.dataset.tdFeedbackKey ?? location.pathname;
  const language = root.dataset.tdFeedbackLang ?? "en";
  const key = `${PREFIX}${language}:${page}`;
  let answer = readAnswer(localStorage, key);

  const render = (): void => {
    for (const button of [first, second]) {
      const mine = button.dataset.tdFeedbackChoice === answer;
      button.setAttribute("aria-pressed", String(mine));
      // 答过之后两个都禁掉，改答案走 change 那个按钮 —— 直接让另一个可点的话，
      // 「改答案」这件事会静默地再发一次事件。
      button.disabled = answer !== null;
    }
    result.hidden = answer === null;
    // issue 入口只在「没帮助」之后出现。
    if (issue) issue.hidden = answer !== "not_helpful";
  };

  for (const button of [first, second]) {
    button.addEventListener("click", () => {
      const value = button.dataset.tdFeedbackChoice;
      if (answer !== null || (value !== "helpful" && value !== "not_helpful")) return;
      answer = value;
      write(key, value);
      render();
      const detail: FeedbackDetail = { result: value, page, language };
      root.dispatchEvent(new CustomEvent<FeedbackDetail>("td:feedback", { detail, bubbles: true }));
    });
  }

  change.addEventListener("click", () => {
    answer = null;
    write(key, null);
    render();
    // 焦点回到第一个选项：刚点的那个按钮此刻被 render() 从禁用变回可用，
    // 但焦点在浏览器把它禁用时已经掉到 body 上了。
    first.focus();
  });

  render();
}

export function init(doc: Document = document): void {
  for (const root of doc.querySelectorAll<HTMLElement>("[data-td-feedback]")) initRoot(root);
}
