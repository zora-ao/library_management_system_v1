import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  afterEach(cleanup);

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
          total_reviews: 2,
        },
        {
          id: "science-book",
          title: "Science Book",
          author: "Second Author",
          isbn: "222",
          category_name: "Science",
          available_copies: 1,
          average_rating: 4,
          total_reviews: 1,
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

    expect(screen.getByRole("heading", { name: "Top rated" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "All books" })).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Fiction1" }));

    expect(screen.queryByRole("heading", { name: "Top rated" })).not.toBeInTheDocument();
    expect(screen.getByText("Fiction Book")).toBeInTheDocument();
    expect(screen.queryByText("Science Book")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "All books" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Available now" })).not.toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "All books" }));

    expect(screen.getByRole("heading", { name: "Top rated" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All genres2" })).toHaveAttribute("aria-pressed", "true");
  });

  it("lists only reviewed books under Top rated, best first", () => {
    const books = useBooksMock().data;
    useBooksMock.mockReturnValue({
      ...useBooksMock(),
      data: [...books, { id: "unrated", title: "Unrated Book", author: "Third", isbn: "333", category_name: "Science", available_copies: 1, average_rating: 0, total_reviews: 0 }],
    });
    render(<BookCatalogPage />);

    const topRated = screen.getByRole("region", { name: "Top rated" });
    expect(within(topRated).getAllByRole("article").map(card => card.textContent)).toEqual(["Fiction Book", "Science Book"]);
  });

  it("explains the empty Top rated section when nothing has been reviewed", () => {
    useBooksMock.mockReturnValue({
      ...useBooksMock(),
      data: useBooksMock().data.map((book: object) => ({ ...book, average_rating: 0, total_reviews: 0 })),
    });
    render(<BookCatalogPage />);

    expect(screen.getByText("Top-rated books will appear here once students leave reviews.")).toBeInTheDocument();
  });

  it("disables Previous on the first page and Next on the last page", () => {
    render(<BookCatalogPage />);

    expect(screen.getByRole("button", { name: "← Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next →" })).toBeDisabled();
  });
});
