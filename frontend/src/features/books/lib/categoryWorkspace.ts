import { containsText, linearSearch, mergeSort } from "@/lib/dsa";
import type { Category } from "../types/category.types";

export type CategorySort = "name-asc" | "name-desc" | "most-books";

export const getCategorySummary = (categories: Category[]) => ({
  totalCategories: categories.length,
  bookTitles: categories.reduce((total, category) => total + (category.book_count ?? 0), 0),
  emptyCategories: categories.filter((category) => (category.book_count ?? 0) === 0).length,
});

export const filterAndSortCategories = (
  categories: Category[],
  search: string,
  sort: CategorySort,
) => {
  const matches = linearSearch(categories, (category) => containsText([category.name], search));
  return mergeSort(matches, (left, right) => {
      if (sort === "most-books") {
        return (right.book_count ?? 0) - (left.book_count ?? 0) || left.name.localeCompare(right.name);
      }
      return sort === "name-desc"
        ? right.name.localeCompare(left.name)
        : left.name.localeCompare(right.name);
    });
};
