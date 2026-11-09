import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Book } from "@/features/books/types/book.types";
import MyFavoritesPage from "./MyFavoritesPage";

const mocks = vi.hoisted(() => ({ favorites: { data: [] as Book[], isLoading: false, isError: false, refetch: vi.fn() } }));

vi.mock("@/hooks/useBooks", () => ({ useFavoriteBooks: () => mocks.favorites }));
vi.mock("@/features/books/components/books/BookCard", () => ({
  default: ({ book }: { book: Book }) => <article aria-label={book.title}>{book.title}</article>,
}));

const book = (overrides: Partial<Book>) => ({
  id: "book-1",
  title: "Clean Code",
  author: "Robert C. Martin",
  category_name: "Programming",
  available_copies: 1,
  total_copies: 2,
  average_rating: 4,
  total_reviews: 2,
  ...overrides,
}) as Book;

const renderPage = () => render(<MemoryRouter><MyFavoritesPage /></MemoryRouter>);
const titles = () => screen.getAllByRole("article").map((card) => card.getAttribute("aria-label"));

describe("MyFavoritesPage", () => {
  beforeEach(() => {
    mocks.favorites = {
      data: [
        book({ id: "1", title: "Refactoring", author: "Martin Fowler", average_rating: 3 }),
        book({ id: "2", title: "Atomic Habits", author: "James Clear", category_name: "Self-Help", available_copies: 0, average_rating: 5 }),
        book({ id: "3", title: "Clean Code" }),
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  afterEach(cleanup);

  it("keeps the saved order and counts saved books", () => {
    renderPage();

    expect(screen.getByText("3 saved books")).toBeInTheDocument();
    expect(titles()).toEqual(["Refactoring", "Atomic Habits", "Clean Code"]);
  });

  it("searches by title, author, or genre and can clear the search", () => {
    renderPage();
    const search = screen.getByRole("searchbox", { name: "Search your favorite books" });

    fireEvent.change(search, { target: { value: "self-help" } });
    expect(titles()).toEqual(["Atomic Habits"]);

    fireEvent.change(search, { target: { value: "no such book" } });
    expect(screen.getByRole("heading", { name: "No favorite books match your search" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(titles()).toHaveLength(3);
  });

  it("filters by availability and sorts by rating", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("combobox", { name: "Availability filter" }));
    await user.click(await screen.findByRole("option", { name: "Currently unavailable" }));
    expect(titles()).toEqual(["Atomic Habits"]);

    await user.click(screen.getByRole("combobox", { name: "Availability filter" }));
    await user.click(await screen.findByRole("option", { name: "All books" }));
    await user.click(screen.getByRole("combobox", { name: "Sort favorites" }));
    await user.click(await screen.findByRole("option", { name: "Highest rated" }));
    expect(titles()).toEqual(["Atomic Habits", "Clean Code", "Refactoring"]);
  });

  it("invites students to browse when nothing is saved", () => {
    mocks.favorites = { ...mocks.favorites, data: [] };
    renderPage();

    expect(screen.getByRole("heading", { name: "Your next great read is waiting" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse Books/ })).toHaveAttribute("href", "/books");
  });
});
