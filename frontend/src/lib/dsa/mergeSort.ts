/**
 * Data structure 1 (array): merge sort.
 *
 * Splits the array in half until each part has one item, then merges the
 * sorted halves back together. Used by every search bar to order the results.
 *
 * Time:  O(n log n) — halving gives about log2(n) levels, and merging at each
 *        level moves all n items once.
 * Space: O(n) — merging needs a temporary array; the input is not changed.
 * Stable: items that compare equal keep their original order.
 */
export type Compare<T> = (left: T, right: T) => number;

export function mergeSort<T>(items: readonly T[], compare: Compare<T>): T[] {
  const working = items.slice();
  if (working.length < 2) return working;
  const buffer: T[] = new Array<T>(working.length);

  const merge = (start: number, middle: number, end: number) => {
    let left = start;
    let right = middle;
    let out = start;
    while (left < middle && right < end) {
      // Take from the left half unless the right item is strictly smaller. Ties
      // keep their order (stable), and a NaN result counts as a tie, exactly
      // like the built-in sort (e.g. two missing dates: Infinity - Infinity).
      if (!(compare(working[left], working[right]) > 0)) buffer[out++] = working[left++];
      else buffer[out++] = working[right++];
    }
    while (left < middle) buffer[out++] = working[left++];
    while (right < end) buffer[out++] = working[right++];
    for (let index = start; index < end; index += 1) working[index] = buffer[index];
  };

  const sortRange = (start: number, end: number) => {
    if (end - start < 2) return;
    const middle = start + Math.floor((end - start) / 2);
    sortRange(start, middle);
    sortRange(middle, end);
    merge(start, middle, end);
  };

  sortRange(0, working.length);
  return working;
}
