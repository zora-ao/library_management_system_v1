import { useState } from "react";
import { Play } from "lucide-react";

import FilterSelect from "@/components/ui/FilterSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  DsaComparisonField,
  DsaOperation,
  DsaRequest,
  DsaSearchField,
  DsaSortDirection,
  DsaSortField,
} from "../types";

const OPERATIONS = [
  { value: "linear_contains", label: "Linear search" },
  { value: "search_compare", label: "Linear vs binary search" },
  { value: "merge_sort", label: "Merge sort" },
  { value: "hash_compare", label: "Linear vs hash table" },
  { value: "bst_range", label: "Balanced BST range" },
];

const SEARCH_FIELDS: { value: DsaSearchField; label: string }[] = [
  { value: "title", label: "Search title" },
  { value: "author", label: "Search author" },
  { value: "isbn", label: "Search ISBN" },
];

interface DsaOperationFormProps {
  pending: boolean;
  onRun: (request: DsaRequest) => void;
  onOperationChange: () => void;
}

export function DsaOperationForm({ pending, onRun, onOperationChange }: DsaOperationFormProps) {
  const [operation, setOperation] = useState<DsaOperation>("linear_contains");
  const [query, setQuery] = useState("");
  const [fields, setFields] = useState<DsaSearchField[]>(["title", "author", "isbn"]);
  const [comparisonField, setComparisonField] = useState<DsaComparisonField>("title");
  const [sortField, setSortField] = useState<DsaSortField>("title");
  const [direction, setDirection] = useState<DsaSortDirection>("asc");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [limit, setLimit] = useState("25");
  const [validationError, setValidationError] = useState("");

  const updateOperation = (next: string) => {
    setOperation(next as DsaOperation);
    setValidationError("");
    onOperationChange();
  };

  const toggleField = (field: DsaSearchField) => {
    setFields((current) => current.includes(field)
      ? current.filter((value) => value !== field)
      : [...current, field]);
  };

  const buildRequest = (): DsaRequest | null => {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      setValidationError("Result limit must be a whole number from 1 to 100.");
      return null;
    }

    const trimmedQuery = query.trim();
    if (operation === "linear_contains") {
      if (!trimmedQuery) {
        setValidationError("Enter a search query.");
        return null;
      }
      if (fields.length === 0) {
        setValidationError("Select at least one search field.");
        return null;
      }
      return { operation, query, fields, limit: parsedLimit };
    }
    if (operation === "search_compare") {
      if (!trimmedQuery) {
        setValidationError("Enter an exact query.");
        return null;
      }
      return { operation, query, field: comparisonField, limit: parsedLimit };
    }
    if (operation === "merge_sort") {
      return { operation, field: sortField, direction, limit: parsedLimit };
    }
    if (operation === "hash_compare") {
      if (!trimmedQuery || !query.replace(/[\s-]/g, "")) {
        setValidationError("Enter an ISBN value.");
        return null;
      }
      return { operation, query, limit: parsedLimit };
    }
    if (!rangeStart.trim() || !rangeEnd.trim()) {
      setValidationError("Enter both title range boundaries.");
      return null;
    }
    const normalizedStart = rangeStart.trim().toLocaleLowerCase().replace(/\s+/g, " ");
    const normalizedEnd = rangeEnd.trim().toLocaleLowerCase().replace(/\s+/g, " ");
    if (normalizedStart > normalizedEnd) {
      setValidationError("Range start must not be greater than range end.");
      return null;
    }
    return {
      operation,
      range_start: rangeStart,
      range_end: rangeEnd,
      limit: parsedLimit,
    };
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const request = buildRequest();
    if (!request) return;
    setValidationError("");
    onRun(request);
  };

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <div className="space-y-2">
        <Label>Operation</Label>
        <FilterSelect
          label="Operation"
          value={operation}
          options={OPERATIONS}
          onChange={updateOperation}
          triggerClassName="h-11"
          disabled={pending}
        />
      </div>

      {operation === "linear_contains" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="dsa-linear-query">Search query</Label>
            <Input id="dsa-linear-query" value={query} maxLength={200} disabled={pending} onChange={(event) => setQuery(event.target.value)} placeholder="Title, author, or ISBN text" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Fields to inspect</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {SEARCH_FIELDS.map((field) => (
                <label key={field.value} className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-control px-3 text-sm">
                  <input type="checkbox" checked={fields.includes(field.value)} disabled={pending} onChange={() => toggleField(field.value)} aria-label={field.label} className="size-4 accent-primary" />
                  {field.label.replace("Search ", "")}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {operation === "search_compare" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dsa-exact-query">Exact query</Label>
            <Input id="dsa-exact-query" value={query} maxLength={200} disabled={pending} onChange={(event) => setQuery(event.target.value)} placeholder="Exact normalized value" />
          </div>
          <div className="space-y-2">
            <Label>Comparison field</Label>
            <FilterSelect label="Comparison field" value={comparisonField} options={[{ value: "title", label: "Title" }, { value: "author", label: "Author" }]} onChange={(value) => setComparisonField(value as DsaComparisonField)} disabled={pending} />
          </div>
        </div>
      )}

      {operation === "merge_sort" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Sort field</Label>
            <FilterSelect label="Sort field" value={sortField} options={[{ value: "title", label: "Title" }, { value: "author", label: "Author" }, { value: "available_copies", label: "Available copies" }, { value: "created_at", label: "Created date" }]} onChange={(value) => setSortField(value as DsaSortField)} disabled={pending} />
          </div>
          <div className="space-y-2">
            <Label>Sort direction</Label>
            <FilterSelect label="Sort direction" value={direction} options={[{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }]} onChange={(value) => setDirection(value as DsaSortDirection)} disabled={pending} />
          </div>
        </div>
      )}

      {operation === "hash_compare" && (
        <div className="space-y-2">
          <Label htmlFor="dsa-isbn-query">ISBN query</Label>
          <Input id="dsa-isbn-query" value={query} maxLength={200} disabled={pending} onChange={(event) => setQuery(event.target.value)} placeholder="978-0-13-235088-4" />
        </div>
      )}

      {operation === "bst_range" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dsa-range-start">Range start</Label>
            <Input id="dsa-range-start" value={rangeStart} maxLength={200} disabled={pending} onChange={(event) => setRangeStart(event.target.value)} placeholder="A" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dsa-range-end">Range end</Label>
            <Input id="dsa-range-end" value={rangeEnd} maxLength={200} disabled={pending} onChange={(event) => setRangeEnd(event.target.value)} placeholder="Mzzzz" />
          </div>
        </div>
      )}

      <div className="space-y-2 sm:max-w-48">
        <Label htmlFor="dsa-result-limit">Result limit</Label>
        <Input id="dsa-result-limit" type="number" min={1} max={100} value={limit} disabled={pending} onChange={(event) => setLimit(event.target.value)} />
      </div>

      {validationError && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{validationError}</p>}

      <Button type="submit" size="lg" className="w-full rounded-full sm:w-auto" disabled={pending}>
        <Play aria-hidden="true" /> {pending ? "Running Python DSA" : "Run Python DSA"}
      </Button>
    </form>
  );
}
