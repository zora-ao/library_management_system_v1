import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DsaOperation, DsaResponse } from "../types";

const api = vi.hoisted(() => ({ run: vi.fn() }));

vi.mock("../api", () => ({ runDsaBookOperation: api.run }));

import DsaExplorerPage from "@/pages/adminPage/DsaExplorerPage";

const makeResponse = (operation: DsaOperation): DsaResponse => ({
  operation,
  dataset: { source: "active_books", size: 42 },
  results: [
    {
      id: "book-1",
      title: "Clean Code",
      author: "Robert Martin",
      isbn: "9780132350884",
      available_copies: 3,
      created_at: "2026-01-02T03:04:05",
    },
  ],
  runs: [
    {
      algorithm: "linear_search",
      result_ids: ["book-1"],
      metrics: {
        comparisons: 42,
        writes: 0,
        nodes_visited: 0,
        collisions: null,
        capacity: null,
        load_factor: null,
        tree_height: null,
        tree_size: null,
        preprocessing_ns: 0,
        algorithm_ns: 12000,
      },
      complexity: { time: "O(n)", space: "O(k)" },
    },
  ],
  notes: ["Timings are single educational samples, not benchmark results."],
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<DsaExplorerPage />, { wrapper: Wrapper });
}

describe("DSA Explorer page", () => {
  beforeEach(() => api.run.mockReset());
  afterEach(cleanup);

  it("does not execute on render and exposes every supported operation", () => {
    renderPage();

    expect(api.run).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Educational DSA Explorer" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Linear search" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Linear vs binary search" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Merge sort" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Linear vs hash table" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Balanced BST range" })).toBeInTheDocument();
  });

  it("submits an exact linear-search payload and renders backend results and measurements", async () => {
    const user = userEvent.setup();
    api.run.mockResolvedValue(makeResponse("linear_contains"));
    renderPage();

    await user.type(screen.getByLabelText("Search query"), "martin");
    await user.clear(screen.getByLabelText("Result limit"));
    await user.type(screen.getByLabelText("Result limit"), "20");
    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    await waitFor(() => expect(api.run.mock.calls[0]?.[0]).toEqual({
      operation: "linear_contains",
      query: "martin",
      fields: ["title", "author", "isbn"],
      limit: 20,
    }));
    expect(await screen.findByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText("42 active books")).toBeInTheDocument();
    expect(screen.getByText("12,000 ns")).toBeInTheDocument();
    expect(screen.getAllByText("O(n)")).not.toHaveLength(0);
    expect(screen.getByRole("img", { name: "Measured execution time comparison" })).toBeInTheDocument();
    expect(screen.getByText(/single educational samples/i)).toBeInTheDocument();
  });

  it.each([
    {
      operation: "search_compare",
      setup: async (user: ReturnType<typeof userEvent.setup>) => {
        await user.type(screen.getByLabelText("Exact query"), "Clean Code");
        await user.selectOptions(screen.getByLabelText("Comparison field"), "author");
      },
      payload: { operation: "search_compare", query: "Clean Code", field: "author", limit: 25 },
    },
    {
      operation: "merge_sort",
      setup: async (user: ReturnType<typeof userEvent.setup>) => {
        await user.selectOptions(screen.getByLabelText("Sort field"), "available_copies");
        await user.selectOptions(screen.getByLabelText("Sort direction"), "desc");
      },
      payload: { operation: "merge_sort", field: "available_copies", direction: "desc", limit: 25 },
    },
    {
      operation: "hash_compare",
      setup: async (user: ReturnType<typeof userEvent.setup>) => {
        await user.type(screen.getByLabelText("ISBN query"), "978-0-13-235088-4");
      },
      payload: { operation: "hash_compare", query: "978-0-13-235088-4", limit: 25 },
    },
    {
      operation: "bst_range",
      setup: async (user: ReturnType<typeof userEvent.setup>) => {
        await user.type(screen.getByLabelText("Range start"), "A");
        await user.type(screen.getByLabelText("Range end"), "Mzzzz");
      },
      payload: { operation: "bst_range", range_start: "A", range_end: "Mzzzz", limit: 25 },
    },
  ])("submits the exact $operation payload", async ({ operation, setup, payload }) => {
    const user = userEvent.setup();
    api.run.mockResolvedValue(makeResponse(operation as DsaOperation));
    renderPage();

    await user.selectOptions(screen.getByLabelText("Operation"), operation);
    await setup(user);
    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    await waitFor(() => expect(api.run.mock.calls[0]?.[0]).toEqual(payload));
  });

  it("validates input before making a request", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a search query");
    expect(api.run).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Search query"), "clean");
    await user.click(screen.getByLabelText("Search title"));
    await user.click(screen.getByLabelText("Search author"));
    await user.click(screen.getByLabelText("Search ISBN"));
    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Select at least one search field");
    expect(api.run).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText("Operation"), "bst_range");
    await user.type(screen.getByLabelText("Range start"), "Z");
    await user.type(screen.getByLabelText("Range end"), "A");
    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Range start must not be greater than range end");
    expect(api.run).not.toHaveBeenCalled();
  });

  it("disables execution while the backend request is pending", async () => {
    const user = userEvent.setup();
    let resolveRequest!: (response: DsaResponse) => void;
    api.run.mockReturnValue(new Promise<DsaResponse>((resolve) => {
      resolveRequest = resolve;
    }));
    renderPage();

    await user.type(screen.getByLabelText("Search query"), "clean");
    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    expect(screen.getByRole("button", { name: "Running Python DSA" })).toBeDisabled();
    expect(screen.getByRole("status", { name: "Running Python algorithms" })).toBeInTheDocument();
    expect(screen.getByLabelText("Operation")).toBeDisabled();

    resolveRequest(makeResponse("linear_contains"));
    expect(await screen.findByText("Clean Code")).toBeInTheDocument();
  });

  it("shows backend authorization errors and retries only after an explicit click", async () => {
    const user = userEvent.setup();
    api.run
      .mockRejectedValueOnce({ response: { status: 403, data: { message: "Staff access required" } } })
      .mockResolvedValueOnce(makeResponse("linear_contains"));
    renderPage();

    await user.type(screen.getByLabelText("Search query"), "clean");
    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Staff access required");
    expect(api.run).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Clean Code")).toBeInTheDocument();
    expect(api.run).toHaveBeenCalledTimes(2);
  });

  it("separates binary-search preprocessing from lookup and confirms equivalent results", async () => {
    const user = userEvent.setup();
    const response = makeResponse("search_compare");
    response.runs.push({
      algorithm: "binary_search",
      result_ids: ["book-1"],
      metrics: {
        comparisons: 6,
        writes: 0,
        nodes_visited: 0,
        collisions: null,
        capacity: null,
        load_factor: null,
        tree_height: null,
        tree_size: null,
        preprocessing_ns: 24000,
        algorithm_ns: 2000,
      },
      complexity: {
        time: "O(log n + k) after O(n log n) preparation",
        space: "O(k), plus O(n) sorted copy",
      },
    });
    api.run.mockResolvedValue(response);
    renderPage();

    await user.selectOptions(screen.getByLabelText("Operation"), "search_compare");
    await user.type(screen.getByLabelText("Exact query"), "Clean Code");
    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    expect(await screen.findByRole("heading", { name: "Binary search" })).toBeInTheDocument();
    expect(screen.getByText(/same ordered record IDs/i)).toBeInTheDocument();
    expect(screen.getByText("24,000 ns")).toBeInTheDocument();
    expect(screen.getByText("2,000 ns")).toBeInTheDocument();
  });

  it("renders empty results and generic failures without inventing data", async () => {
    const user = userEvent.setup();
    const empty = makeResponse("linear_contains");
    empty.results = [];
    empty.runs[0].result_ids = [];
    api.run.mockResolvedValueOnce(empty);
    renderPage();
    await user.type(screen.getByLabelText("Search query"), "missing title");
    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    expect(await screen.findByText("No records matched this operation.")).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "Clean Code" })).not.toBeInTheDocument();

    cleanup();
    api.run.mockRejectedValueOnce(new Error("Network unavailable"));
    renderPage();
    await user.type(screen.getByLabelText("Search query"), "clean");
    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
  });

  it("uses responsive stacking before the wide two-column layout", () => {
    renderPage();
    expect(screen.getByRole("main").parentElement).toHaveClass(
      "grid",
      "xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]",
    );
  });

  it("renders hash collision and balanced-tree statistics returned by the backend", async () => {
    const user = userEvent.setup();
    const hashResponse = makeResponse("hash_compare");
    hashResponse.runs[0].metrics = {
      ...hashResponse.runs[0].metrics,
      collisions: 7,
      capacity: 16,
      load_factor: 0.625,
      preprocessing_ns: 30000,
    };
    api.run.mockResolvedValueOnce(hashResponse);
    renderPage();
    await user.selectOptions(screen.getByLabelText("Operation"), "hash_compare");
    await user.type(screen.getByLabelText("ISBN query"), "9780132350884");
    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    expect(await screen.findByText("7", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("0.625")).toBeInTheDocument();
    expect(screen.getByText("30,000 ns")).toBeInTheDocument();

    cleanup();
    const bstResponse = makeResponse("bst_range");
    bstResponse.runs[0].algorithm = "balanced_title_bst";
    bstResponse.runs[0].metrics = {
      ...bstResponse.runs[0].metrics,
      nodes_visited: 8,
      tree_height: 6,
      tree_size: 42,
    };
    api.run.mockResolvedValueOnce(bstResponse);
    renderPage();
    await user.selectOptions(screen.getByLabelText("Operation"), "bst_range");
    await user.type(screen.getByLabelText("Range start"), "A");
    await user.type(screen.getByLabelText("Range end"), "Mzzzz");
    await user.click(screen.getByRole("button", { name: "Run Python DSA" }));

    expect(await screen.findByRole("heading", { name: "Balanced title BST" })).toBeInTheDocument();
    expect(screen.getByText("6", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("Tree nodes").parentElement).toHaveTextContent("42");
  });
});
