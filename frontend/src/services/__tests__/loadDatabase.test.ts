import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { tenders as seedTenders } from "@/data/seed";

const STORAGE_KEY = "tender-portal-demo";

describe("mockApi loadDatabase migrations", () => {
  beforeAll(() => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "00000000-0000-0000-0000-000000000000",
      getRandomValues: (array: Uint8Array) => array.fill(0)
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
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
});
