/**
 * Data structure 1 (array): linear search.
 *
 * Checks every item once, from first to last, and keeps the ones that match.
 * Used by every search bar, because the search text can appear anywhere in a
 * title ("Code" in "Clean Code"), so a sorted order cannot help.
 *
 * Time:  O(n) — each of the n items is checked exactly once.
 * Space: O(m) — a new array holds the m matches; the input is not changed.
 */
export function linearSearch<T>(items: readonly T[], matches: (item: T) => boolean): T[] {
  const found: T[] = [];
  for (let index = 0; index < items.length; index += 1) {
    if (matches(items[index])) found.push(items[index]);
  }
  return found;
}

/**
 * True when the search text appears in any of the values, ignoring case.
 * An empty search matches everything. Missing values (null/undefined) are skipped.
 */
export function containsText(values: readonly (string | null | undefined)[], query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value && value.toLowerCase().includes(needle)) return true;
  }
  return false;
}
