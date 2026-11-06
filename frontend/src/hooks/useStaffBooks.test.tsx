import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/services/api";
import { getStaffBooks, restoreBook } from "@/features/books/api/books";
import { useArchiveBook, useRestoreBook, useStaffBooks } from "./useBooks";

vi.mock("@/services/api", () => ({
  api: { get: vi.fn(), delete: vi.fn(), put: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const book = {
  id: "book-1",
  title: "Clean Code",
  author: "Robert C. Martin",
  category_id: "category-1",
  total_copies: 2,
  available_copies: 1,
  image_url: "",
  pages: 464,
  is_deleted: false,
  archived_at: null,
};

const wrapper = (client: QueryClient) =>
  ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

describe("staff books data layer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests each staff catalog state", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [book] });
    await expect(getStaffBooks("active")).resolves.toEqual([book]);
    await expect(getStaffBooks("archived")).resolves.toEqual([book]);
    expect(api.get).toHaveBeenNthCalledWith(1, "/books/admin/catalog", {
      params: { state: "active" },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, "/books/admin/catalog", {
      params: { state: "archived" },
    });
  });

  it("uses the state in the staff query key", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [book] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useStaffBooks("archived"), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.data).toEqual([book]));
    expect(client.getQueryData(["books", "staff", "archived"])).toEqual([book]);
  });

  it("archives and restores while invalidating related catalogs", async () => {
    const archived = { message: "archived", book: { ...book, is_deleted: true } };
    vi.mocked(api.delete).mockResolvedValue({ data: archived });
    vi.mocked(api.put).mockResolvedValue({ data: { message: "restored", book } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const archiveHook = renderHook(() => useArchiveBook(), { wrapper: wrapper(client) });
    const restoreHook = renderHook(() => useRestoreBook(), { wrapper: wrapper(client) });

    await act(async () => archiveHook.result.current.mutateAsync(book.id));
    await act(async () => restoreHook.result.current.mutateAsync(book.id));

    expect(api.delete).toHaveBeenCalledWith("/books/book-1");
    expect(api.put).toHaveBeenCalledWith("/books/restore/book-1");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["books"] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["books", "staff"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["book"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["categories"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    await expect(restoreBook(book.id)).resolves.toEqual({ message: "restored", book });
  });
});
