import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, put } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@/services/api", () => ({
  api: { get, post: vi.fn(), put },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { confirmPickup, rejectBorrow } from "@/features/borrows/api/borrows";
import {
  useApproveBorrow,
  useBorrowHistory,
  useConfirmBorrowPickup,
  useRejectBorrow,
} from "./useBorrows";

const response = { data: { borrow: { id: "borrow-1", status: "READY_FOR_PICKUP" } } };

describe("borrow workflow API", () => {
  beforeEach(() => {
    get.mockReset();
    put.mockReset();
    put.mockResolvedValue(response);
  });

  it("reuses fresh borrowing history when a later observer mounts", async () => {
    get.mockResolvedValue({ data: [] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = createWrapper(queryClient);

    const first = renderHook(() => useBorrowHistory(), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    const second = renderHook(() => useBorrowHistory(), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/borrows/history");
    second.unmount();
    queryClient.clear();
  });

  it("sends the rejection reason and pickup endpoint", async () => {
    await rejectBorrow("borrow-1", "Missing ID");
    await confirmPickup("borrow-1");

    expect(put).toHaveBeenNthCalledWith(
      1,
      "/borrows/admin/borrow-1/reject-borrow",
      { reason: "Missing ID" },
    );
    expect(put).toHaveBeenNthCalledWith(2, "/borrows/admin/borrow-1/confirm-pickup");
  });

  const createWrapper = (queryClient: QueryClient) =>
    ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

  it("invalidates borrow data but keeps unchanged book data after rejection", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["borrows", "admin"], []);
    queryClient.setQueryData(["borrows", "active"], []);
    queryClient.setQueryData(["borrows", "history"], []);
    queryClient.setQueryData(["books"], []);
    queryClient.setQueryData(["dashboard"], { pending: 1 });
    const { result } = renderHook(() => useRejectBorrow(), { wrapper: createWrapper(queryClient) });

    await act(async () => { await result.current.mutateAsync({ borrowId: "borrow-1", reason: "Missing ID" }); });

    await waitFor(() => {
      expect(queryClient.getQueryState(["borrows", "admin"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["borrows", "active"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["borrows", "history"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["books"])?.isInvalidated).toBe(false);
      expect(queryClient.getQueryState(["dashboard"])?.isInvalidated).toBe(true);
    });
  });

  it("invalidates borrow data but keeps unchanged book data after pickup", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["borrows", "admin"], []);
    queryClient.setQueryData(["borrows", "active"], []);
    queryClient.setQueryData(["borrows", "history"], []);
    queryClient.setQueryData(["books"], []);
    queryClient.setQueryData(["dashboard"], { waiting_for_pickup: 1 });
    const { result } = renderHook(() => useConfirmBorrowPickup(), { wrapper: createWrapper(queryClient) });

    await act(async () => { await result.current.mutateAsync("borrow-1"); });

    await waitFor(() => {
      expect(queryClient.getQueryState(["borrows", "admin"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["borrows", "active"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["borrows", "history"])?.isInvalidated).toBe(false);
      expect(queryClient.getQueryState(["books"])?.isInvalidated).toBe(false);
      expect(queryClient.getQueryState(["dashboard"])?.isInvalidated).toBe(true);
    });
  });

  it("invalidates catalogs and the affected book after approval changes availability", async () => {
    put.mockResolvedValue({ data: { borrow: { ...response.data.borrow, book_id: "book-1" } } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["borrows", "admin"], []);
    queryClient.setQueryData(["borrows", "active"], []);
    queryClient.setQueryData(["borrows", "history"], []);
    queryClient.setQueryData(["books"], []);
    queryClient.setQueryData(["book", "book-1"], { id: "book-1", available_copies: 1 });
    queryClient.setQueryData(["dashboard"], { pending: 1 });
    const { result } = renderHook(() => useApproveBorrow(), { wrapper: createWrapper(queryClient) });

    await act(async () => { await result.current.mutateAsync("borrow-1"); });

    await waitFor(() => {
      expect(queryClient.getQueryState(["borrows", "admin"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["borrows", "active"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["borrows", "history"])?.isInvalidated).toBe(false);
      expect(queryClient.getQueryState(["books"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["book", "book-1"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["dashboard"])?.isInvalidated).toBe(true);
    });
  });
});
