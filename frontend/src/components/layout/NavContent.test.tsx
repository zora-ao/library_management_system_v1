import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavContent } from "./NavContent";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      username: "Alex Admin",
      email: "alex@library.test",
      avatar_url: "",
      role: "admin",
      is_active: true,
    },
    logout: vi.fn(),
  }),
  useGetAllUsers: () => ({
    data: [
      { id: "1", role: "librarian" },
      { id: "2", role: "student" },
    ],
  }),
}));

describe("admin sidebar navigation", () => {
  afterEach(cleanup);

  it("renders Users and Borrow Requests with collapsible submenus", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NavContent />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/users/librarian");
    const usersToggle = screen.getByRole("button", { name: /Expand Users menu/i });
    expect(usersToggle).toBeInTheDocument();

    fireEvent.click(usersToggle);
    expect(screen.getByRole("link", { name: /Librarians/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Students/i })).toBeInTheDocument();

    const borrowRequestsToggle = screen.getByRole("button", { name: /Expand Borrow Requests menu/i });
    expect(borrowRequestsToggle).toBeInTheDocument();
    fireEvent.click(borrowRequestsToggle);
    expect(screen.getByRole("link", { name: /Pending/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /For Pickup/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /History/i })).toBeInTheDocument();
  });
});
