import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { tenders as seedTenders } from "@/data/seed";

const STORAGE_KEY = "tender-portal-demo";

describe("mockApi loadDatabase migrations", () => {
  const cryptoStub = {
    randomUUID: () => "00000000-0000-0000-0000-000000000000",
    getRandomValues: (array: Uint8Array) => array.fill(0)
  } satisfies Pick<Crypto, "randomUUID" | "getRandomValues">;

  beforeEach(() => {
    vi.stubGlobal("crypto", cryptoStub);
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("seeds fresh data with alerts populated", async () => {
    vi.useFakeTimers();
    const mockApi = await import("@/services/mockApi");
    const listPromise = mockApi.listTenders();
    await vi.runAllTimersAsync();
    const tenders = await listPromise;

    expect(tenders.length).toBeGreaterThan(0);
    expect(tenders[0].alerts).toBeDefined();
    expect(tenders[0].alerts?.submissionReminderAt ?? null).not.toBeUndefined();
  });

  it("migrates legacy tenders missing alerts and updates storage", async () => {
    const legacyTender = JSON.parse(JSON.stringify(seedTenders[0])) as any;
    delete legacyTender.alerts;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tenders: [legacyTender],
        projects: [],
        suppliers: [],
        invoices: [],
        notifications: [],
        users: []
      })
    );

    vi.useFakeTimers();
    const mockApi = await import("@/services/mockApi");
    const listPromise = mockApi.listTenders();
    await vi.runAllTimersAsync();
    const tenders = await listPromise;

    expect(tenders[0].alerts).toBeDefined();
    expect(tenders[0].alerts?.needsSpecificationPurchase).toBeTypeOf("boolean");

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as any;
    expect(persisted?.tenders?.[0]?.alerts?.submissionReminderAt ?? undefined).not.toBeUndefined();
  });

  it("falls back to window.msCrypto when globalThis is unavailable", async () => {
    const root = globalThis as typeof globalThis & {
      window?: Record<string, unknown>;
      self?: Record<string, unknown>;
    };

    const originalGlobalThisDescriptor = Object.getOwnPropertyDescriptor(root, "globalThis");
    const originalWindow = root.window;
    const originalSelf = root.self;
    const originalCrypto = (root as typeof root & { crypto?: Crypto | undefined }).crypto;

    const msCrypto: Pick<Crypto, "getRandomValues"> & Partial<Crypto> = {
      getRandomValues: vi.fn((array: Uint8Array) => array.fill(0))
    };

    try {
      Object.defineProperty(root, "globalThis", {
        value: undefined,
        configurable: true,
        writable: true
      });

      root.window = { msCrypto };
      root.self = { msCrypto };
      (root as typeof root & { crypto?: Crypto | undefined }).crypto = undefined;

      const { prefixedRandomId } = await import("@/utils/random");
      const id = prefixedRandomId("ms");

      expect(id).toBe("ms-00000000-0000-4000-8000-000000000000");
      expect(msCrypto.getRandomValues).toHaveBeenCalledTimes(1);
    } finally {
      if (originalGlobalThisDescriptor) {
        Object.defineProperty(root, "globalThis", originalGlobalThisDescriptor);
      } else {
        delete (root as typeof root & { globalThis?: unknown }).globalThis;
      }

      if (originalWindow === undefined) {
        delete root.window;
      } else {
        root.window = originalWindow;
      }

      if (originalSelf === undefined) {
        delete root.self;
      } else {
        root.self = originalSelf;
      }

      if (originalCrypto === undefined) {
        delete (root as typeof root & { crypto?: Crypto | undefined }).crypto;
      } else {
        (root as typeof root & { crypto?: Crypto | undefined }).crypto = originalCrypto;
      }
    }
  });
});
