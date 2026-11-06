import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "@/services/api";
import { getDashboard } from "@/features/dashboard/api/dashboard";
import { useDashboard } from "./useDashboard";

vi.mock("@/services/api", () => ({ api: { get: vi.fn() } }));

const summary = {
  book_titles: 1,
  total_copies: 2,
  available_copies: 1,
  categories: 1,
  pending: 0,
  waiting_for_pickup: 0,
  active: 1,
  overdue: 0,
  returned: 3,
  returned_today: 0,
  attention: [],
  recent: [],
  activity: [],
};

describe("dashboard data layer", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the browser timezone offset to the compact endpoint", async () => {
    vi.spyOn(Date.prototype, "getTimezoneOffset").mockReturnValue(-480);
    vi.mocked(api.get).mockResolvedValue({ data: summary });

    await expect(getDashboard()).resolves.toEqual(summary);

    expect(api.get).toHaveBeenCalledWith("/dashboard", {
      params: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezone_offset_minutes: -480,
      },
    });
  });

  it("reuses a fresh dashboard response when the page remounts", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: summary });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const first = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();
    const second = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledTimes(1);
    second.unmount();
    client.clear();
  });
});
