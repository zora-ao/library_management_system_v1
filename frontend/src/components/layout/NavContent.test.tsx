import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavContent } from "./NavContent";

const authState = vi.hoisted(() => ({ role: "admin", logout: vi.fn() }));

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
    logout: authState.logout,
  }),
}));

describe("admin sidebar navigation", () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
    authState.role = "admin";
    authState.logout.mockReset();
  });

  const LocationProbe = () => {
    const location = useLocation();
    return <output aria-label="Current path">{location.pathname}</output>;
  };

  it("renders Users as a direct link and keeps the Borrow Requests submenu", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NavContent />
      </MemoryRouter>,
    );

    const sidebarLogo = container.querySelector('img[src="/Logo.png"]');
    expect(sidebarLogo).toBeInTheDocument();
    expect(sidebarLogo?.parentElement).toHaveClass("bg-transparent");
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
    expect(screen.getByRole("link", { name: "Rejected" })).toHaveAttribute("href", "/borrow-requests/rejected");
    expect(screen.queryByRole("link", { name: /History/i })).not.toBeInTheDocument();
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

  it("moves Settings and Logout from standalone navigation into the profile menu for admins", async () => {
    render(<MemoryRouter><NavContent /></MemoryRouter>);

    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();

    const accountMenu = screen.getByRole("button", { name: "Account menu for Alex Admin" });
    fireEvent.mouseEnter(accountMenu);

    expect(await screen.findByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeInTheDocument();
  });

  it("shows the same profile menu for librarians without administrator-only links", async () => {
    authState.role = "librarian";
    render(<MemoryRouter><NavContent /></MemoryRouter>);

    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Data Backups" })).not.toBeInTheDocument();

    const accountMenu = screen.getByRole("button", { name: "Account menu for Alex Admin" });
    fireEvent.mouseEnter(accountMenu);

    expect(await screen.findByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeInTheDocument();
  });

  it("keeps the menu open while moving from the profile trigger into the menu", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NavContent /></MemoryRouter>);

    const accountMenu = screen.getByRole("button", { name: "Account menu for Alex Admin" });
    await user.hover(accountMenu);
    const menu = await screen.findByRole("menu");

    await user.unhover(accountMenu);
    await user.hover(menu);
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 220)));

    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
  });

  it("opens the account menu with keyboard activation", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NavContent /></MemoryRouter>);
    const accountMenu = screen.getByRole("button", { name: "Account menu for Alex Admin" });

    accountMenu.focus();
    expect(accountMenu).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeInTheDocument();
  });

  it("uses the avatar as an accessible account trigger when collapsed", () => {
    render(<MemoryRouter><NavContent collapsed /></MemoryRouter>);

    const accountMenu = screen.getByRole("button", { name: "Account menu for Alex Admin" });
    expect(accountMenu).toBeInTheDocument();
    fireEvent.click(accountMenu);

    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Logout" })).toBeInTheDocument();
  });

  it("navigates to Settings and logs out before navigating to login", async () => {
    let resolveLogout!: () => void;
    authState.logout.mockReturnValue(new Promise<void>((resolve) => {
      resolveLogout = resolve;
    }));
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NavContent />
        <LocationProbe />
      </MemoryRouter>,
    );

    const accountMenu = screen.getByRole("button", { name: "Account menu for Alex Admin" });
    fireEvent.mouseEnter(accountMenu);
    fireEvent.click(screen.getByRole("menuitem", { name: "Settings" }));
    expect(screen.getByRole("status", { name: "Current path" })).toHaveTextContent("/profile");

    fireEvent.mouseEnter(accountMenu);
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));
    expect(authState.logout).toHaveBeenCalledOnce();
    expect(screen.getByRole("status", { name: "Current path" })).toHaveTextContent("/profile");

    await act(async () => resolveLogout());
    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Current path" })).toHaveTextContent("/login");
    });
  });

  it("stays closed when Escape returns focus to the account trigger", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NavContent /></MemoryRouter>);
    const accountMenu = screen.getByRole("button", { name: "Account menu for Alex Admin" });
    const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 80)));

    await act(async () => accountMenu.focus());
    await settle();
    await user.keyboard("{ArrowDown}");
    await settle();
    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await settle();

    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Settings" })).not.toBeInTheDocument();
    });
    expect(accountMenu).toHaveFocus();
  });

  it("keeps the menu closed after selecting Settings", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NavContent />
        <LocationProbe />
      </MemoryRouter>,
    );
    const accountMenu = screen.getByRole("button", { name: "Account menu for Alex Admin" });
    const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 80)));

    await user.click(accountMenu);
    await settle();
    await user.click(screen.getByRole("menuitem", { name: "Settings" }));
    await settle();

    expect(screen.getByRole("status", { name: "Current path" })).toHaveTextContent("/profile");
    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Settings" })).not.toBeInTheDocument();
    });
  });

  it("closes after the pointer leaves both the profile trigger and menu", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NavContent /></MemoryRouter>);
    const accountMenu = screen.getByRole("button", { name: "Account menu for Alex Admin" });

    await user.hover(accountMenu);
    const menu = await screen.findByRole("menu");
    await user.unhover(accountMenu);
    await user.hover(menu);
    await user.unhover(menu);
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 220)));

    expect(screen.queryByRole("menuitem", { name: "Settings" })).not.toBeInTheDocument();
  });
});
