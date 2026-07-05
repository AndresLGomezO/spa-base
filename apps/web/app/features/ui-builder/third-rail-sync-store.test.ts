import { describe, expect, it, vi } from "vitest";

import {
  createSplitThirdRailSyncStore,
  createThirdRailSyncStore,
} from "./third-rail-sync-store";

describe("createThirdRailSyncStore", () => {
  it("defers subscriber notifications until after publish returns", () => {
    const store = createThirdRailSyncStore({ count: 0 });
    const listener = vi.fn();

    store.subscribe(listener);
    store.publish({ count: 1 });

    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual({ count: 1 });
  });

  it("notifies subscribers on the next microtask", async () => {
    const store = createThirdRailSyncStore({ count: 0 });
    const listener = vi.fn();

    store.subscribe(listener);
    store.publish({ count: 1 });

    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("createSplitThirdRailSyncStore", () => {
  it("notifies context and session subscribers independently", async () => {
    const contextValue = { id: 1 };
    const session = { panel: "row" };
    const store = createSplitThirdRailSyncStore<
      { id: number },
      { panel: string }
    >({
      contextValue,
      session,
    });
    const contextListener = vi.fn();
    const sessionListener = vi.fn();

    store.subscribeContext(contextListener);
    store.subscribeSession(sessionListener);

    store.publish({
      contextValue: { id: 2 },
      session,
    });

    await Promise.resolve();

    expect(contextListener).toHaveBeenCalledTimes(1);
    expect(sessionListener).not.toHaveBeenCalled();
  });

  it("notifies session subscribers when the panel session changes", async () => {
    const contextValue = { id: 1 };
    const session = { panel: "row" };
    const store = createSplitThirdRailSyncStore<
      { id: number },
      { panel: string }
    >({
      contextValue,
      session,
    });
    const contextListener = vi.fn();
    const sessionListener = vi.fn();

    store.subscribeContext(contextListener);
    store.subscribeSession(sessionListener);

    store.publish({
      contextValue,
      session: { panel: "column" },
    });

    await Promise.resolve();

    expect(contextListener).not.toHaveBeenCalled();
    expect(sessionListener).toHaveBeenCalledTimes(1);
  });
});
