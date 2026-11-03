import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BookCatalogPage from "./BookCatalogPage";

const useBooksMock = vi.fn();
const useCategoriesMock = vi.fn();

vi.mock("@/hooks/useBooks", () => ({
  useBooks: () => useBooksMock(),
}));

vi.mock("@/hooks/useCategories", () => ({
  useCategories: () => useCategoriesMock(),
}));

vi.mock("@/features/books/components/books/BookCard", () => ({
  default: ({ book }: { book: { title: string } }) => <article>{book.title}</article>,
}));

describe("BookCatalogPage filters", () => {
  beforeEach(() => {
    useBooksMock.mockReturnValue({
      data: [
        {
          id: "fiction-book",
          title: "Fiction Book",
          author: "First Author",
          isbn: "111",
          category_name: "Fiction",
          available_copies: 0,
          average_rating: 5,
        },
        {
          id: "science-book",
          title: "Science Book",
          author: "Second Author",
          isbn: "222",
          category_name: "Science",
          available_copies: 1,
          average_rating: 4,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    useCategoriesMock.mockReturnValue({
      data: [{ id: "fiction", name: "Fiction" }, { id: "science", name: "Science" }],
    });
  });

  it("separates genre selection from availability and resets the genre for all books", () => {
    render(<BookCatalogPage />);

    expect(screen.getByRole("heading", { name: "Popular this week" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "All books" })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Fiction1" }));

    expect(screen.queryByRole("heading", { name: "Popular this week" })).not.toBeInTheDocument();
    expect(screen.getByText("Fiction Book")).toBeInTheDocument();
    expect(screen.queryByText("Science Book")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "All books" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Available now" })).not.toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "All books" }));

    expect(screen.getByRole("heading", { name: "Popular this week" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All genres2" })).toHaveAttribute("aria-pressed", "true");
  });
});
