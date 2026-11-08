import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock("@/services/api", () => ({ api: mocks }));

import { runDsaBookOperation } from "./api";
import type { DsaRequest, DsaResponse } from "./types";

describe("DSA Explorer API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("posts the exact operation payload and returns the typed response", async () => {
    const payload: DsaRequest = {
      operation: "search_compare",
      query: "Clean Code",
      field: "title",
      limit: 25,
    };
    const response: DsaResponse = {
      operation: "search_compare",
      dataset: { source: "active_books", size: 42 },
      results: [],
      runs: [],
      notes: [],
    };
    mocks.post.mockResolvedValue({ data: response });

    await expect(runDsaBookOperation(payload)).resolves.toEqual(response);

    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.post).toHaveBeenCalledWith("/dsa/books/run", payload);
  });
});
