import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavContent } from "./NavContent";

const authState = vi.hoisted(() => ({ role: "admin" }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      username: "Alex Admin",
      email: "alex@library.test",
      avatar_url: "",
      role: authState.role,
      is_active: true,
    },
    logout: vi.fn(),
  }),
}));

describe("admin sidebar navigation", () => {
  afterEach(() => {
    cleanup();
    authState.role = "admin";
  });

  it("renders Users as a direct link and keeps the Borrow Requests submenu", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NavContent />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/users");
    expect(screen.queryByRole("button", { name: /Users menu/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Librarians/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Students/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Data Backups" })).toHaveAttribute("href", "/backups");

    const borrowRequestsToggle = screen.getByRole("button", { name: /Expand Borrow Requests menu/i });
    expect(borrowRequestsToggle).toBeInTheDocument();
    fireEvent.click(borrowRequestsToggle);
    expect(screen.getByRole("link", { name: /Pending/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /For Pickup/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /History/i })).toBeInTheDocument();
  });

  it("keeps Data Backups available by name when collapsed", () => {
    render(<MemoryRouter><NavContent collapsed /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Data Backups" })).toHaveAttribute("href", "/backups");
  });

  it("does not show administrator links to librarians", () => {
    authState.role = "librarian";
    render(<MemoryRouter><NavContent /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Data Backups" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
  });
});
