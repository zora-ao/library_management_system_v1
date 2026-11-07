export type DsaOperation =
  | "linear_contains"
  | "search_compare"
  | "merge_sort"
  | "hash_compare"
  | "bst_range";

export type DsaSearchField = "title" | "author" | "isbn";
export type DsaComparisonField = "title" | "author";
export type DsaSortField = "title" | "author" | "available_copies" | "created_at";
export type DsaSortDirection = "asc" | "desc";

interface DsaRequestBase {
  limit: number;
}

export interface LinearContainsRequest extends DsaRequestBase {
  operation: "linear_contains";
  query: string;
  fields: DsaSearchField[];
}

export interface SearchCompareRequest extends DsaRequestBase {
  operation: "search_compare";
  query: string;
  field: DsaComparisonField;
}

export interface MergeSortRequest extends DsaRequestBase {
  operation: "merge_sort";
  field: DsaSortField;
  direction: DsaSortDirection;
}

export interface HashCompareRequest extends DsaRequestBase {
  operation: "hash_compare";
  query: string;
}

export interface BstRangeRequest extends DsaRequestBase {
  operation: "bst_range";
  range_start: string;
  range_end: string;
}

export type DsaRequest =
  | LinearContainsRequest
  | SearchCompareRequest
  | MergeSortRequest
  | HashCompareRequest
  | BstRangeRequest;

export interface DsaBookRecord {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  available_copies: number;
  created_at: string | null;
}

export interface DsaRunMetrics {
  comparisons: number;
  writes: number;
  nodes_visited: number;
  collisions: number | null;
  capacity: number | null;
  load_factor: number | null;
  tree_height: number | null;
  tree_size: number | null;
  preprocessing_ns: number;
  algorithm_ns: number;
}

export interface DsaRun {
  algorithm: string;
  result_ids: string[];
  metrics: DsaRunMetrics;
  complexity: {
    time: string;
    space: string;
  };
}

export interface DsaResponse {
  operation: DsaOperation;
  dataset: {
    source: "active_books";
    size: number;
  };
  results: DsaBookRecord[];
  runs: DsaRun[];
  notes: string[];
}
