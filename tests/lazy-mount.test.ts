import { afterEach, describe, expect, it, vi } from "vitest";
import { lazyMount } from "../src/ts/lazy-mount.js";

/**
 * 手写的 IntersectionObserver 替身，不装 jsdom。
 *
 * 被测的是「什么时候挂、挂几次、空输入建不建观察器」这三条判定，全都发生在回调
 * 里，不碰真实布局 —— 真实的 IntersectionObserver 反而测不了这些（无头环境里
 * 视口交叉本身要产帧）。所以这里把「进视口」做成一个能手动触发的方法。
 *
 * 与 `markmap.test.ts`、`search-excerpt.test.ts` 同一个路子。
 */
class FakeObserver {
  static instances: FakeObserver[] = [];

  observed: unknown[] = [];
  unobserved: unknown[] = [];
  options: IntersectionObserverInit;
  private cb: IntersectionObserverCallback;

  constructor(cb: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.cb = cb;
    this.options = options;
    FakeObserver.instances.push(this);
  }

  observe(target: unknown): void {
    this.observed.push(target);
  }

  unobserve(target: unknown): void {
    this.unobserved.push(target);
  }

  disconnect(): void {}

  /** 手动送一批 entry 进回调。`isIntersecting` 由调用方决定。 */
  fire(targets: unknown[], isIntersecting = true): void {
    const entries = targets.map((target) => ({ target, isIntersecting }));
    this.cb(entries as unknown as IntersectionObserverEntry[], this as never);
  }
}

/** 装上替身，返回一组假 host。 */
function setup(count: number): { hosts: HTMLElement[] } {
  FakeObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  const hosts = Array.from({ length: count }, (_, i) => ({ id: `host-${i}` }) as unknown as HTMLElement);
  return { hosts };
}

const only = () => {
  const [first] = FakeObserver.instances;
  if (!first) throw new Error("没有建观察器");
  return first;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lazyMount", () => {
  it("进视口才挂载", () => {
    const { hosts } = setup(2);
    const mount = vi.fn();
    lazyMount(hosts, "400px", mount);

    // 建了观察器、两个 host 都在观察，但还没挂。
    expect(only().observed).toEqual(hosts);
    expect(mount).not.toHaveBeenCalled();

    // 只有第一个进视口。
    only().fire([hosts[0]]);
    expect(mount.mock.calls.map(([h]) => h)).toEqual([hosts[0]]);
  });

  it("没进视口的 entry 不挂载也不 unobserve", () => {
    const { hosts } = setup(1);
    const mount = vi.fn();
    lazyMount(hosts, "400px", mount);

    only().fire(hosts, false);
    expect(mount).not.toHaveBeenCalled();
    expect(only().unobserved).toEqual([]);
  });

  it("只挂一次：进视口先 unobserve 再挂载", () => {
    const { hosts } = setup(1);
    const mount = vi.fn();
    lazyMount(hosts, "400px", mount);

    only().fire(hosts);
    // 真正拦住重复的是 unobserve —— 挂载是异步的，同一个 host 会被送两次。
    expect(only().unobserved).toEqual(hosts);
    expect(mount).toHaveBeenCalledTimes(1);
  });

  it("hosts 为空不建观察器", () => {
    setup(0);
    const mount = vi.fn();
    lazyMount([], "400px", mount);

    // 大多数页面没有图表，建一个从不触发的观察器是纯浪费。
    expect(FakeObserver.instances).toHaveLength(0);
    expect(mount).not.toHaveBeenCalled();
  });

  it("rootMargin 原样传给观察器", () => {
    const { hosts } = setup(1);
    lazyMount(hosts, "600px", vi.fn());
    expect(only().options.rootMargin).toBe("600px");
  });

  it("按进视口的先后挂载，与 hosts 的顺序无关", () => {
    // 回调只拿 host。要下标的调用点（mermaid 给图编号）自己 indexOf ——
    // 放进这里的话另外四个每次挂载都白算一次查找。
    const { hosts } = setup(3);
    const mount = vi.fn();
    lazyMount(hosts, "400px", mount);

    only().fire([hosts[2], hosts[0]]);
    expect(mount.mock.calls).toEqual([[hosts[2]], [hosts[0]]]);
  });
});
