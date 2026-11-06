import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/services/api";
import { useUpdateUserRole } from "./useAuth";

vi.mock("@/services/api", () => ({ api: { put: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const wrapper = (client: QueryClient) =>
  ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

describe("user mutation cache invalidation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refreshes users and the dashboard after a role change", async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: { id: "user-1", username: "Pat", email: "pat@example.com", role: "librarian" },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateUserRole(), { wrapper: wrapper(client) });

    await act(async () => result.current.mutateAsync({ userId: "user-1", role: "librarian" }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });

  it("does not invalidate the dashboard when the role change fails", async () => {
    vi.mocked(api.put).mockRejectedValue(new Error("network failure"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUpdateUserRole(), { wrapper: wrapper(client) });

    await expect(
      act(async () => result.current.mutateAsync({ userId: "user-1", role: "librarian" })),
    ).rejects.toThrow("network failure");

    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  });
});
