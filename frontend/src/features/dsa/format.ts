const ALGORITHM_NAMES: Record<string, string> = {
  linear_search: "Linear search",
  binary_search: "Binary search",
  merge_sort: "Merge sort",
  separate_chaining_hash_table: "Separate-chaining hash table",
  balanced_title_bst: "Balanced title BST",
};

export const algorithmName = (value: string) => ALGORITHM_NAMES[value] ?? value.replaceAll("_", " ");
