import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/services/api";
import { useCategories, useUpdateCategory } from "./useCategories";

vi.mock("@/services/api", () => ({ api: { get: vi.fn(), put: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("category mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reuses fresh categories when a later observer mounts", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{ id: "c1", name: "Engineering", book_count: 2 }] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const first = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    const second = renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith("/categories");
    second.unmount();
    client.clear();
  });

  it("refreshes categories and cached book catalogs after a rename", async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { category: { id: "c1", name: "Engineering", book_count: 2 } } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useUpdateCategory(), { wrapper });

    await act(async () => result.current.mutateAsync({ id: "c1", data: { name: "Engineering" } }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["categories"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["books"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });
});
