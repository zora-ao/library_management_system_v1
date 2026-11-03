import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    authState.role = "admin";
    authState.logout.mockReset();
  });

  const LocationProbe = () => {
    const location = useLocation();
    return <output aria-label="Current path">{location.pathname}</output>;
  };

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

  it("keeps the menu open while moving from the profile trigger into the menu", () => {
    vi.useFakeTimers();
    render(<MemoryRouter><NavContent /></MemoryRouter>);

    const accountMenu = screen.getByRole("button", { name: "Account menu for Alex Admin" });
    fireEvent.mouseEnter(accountMenu);
    const menu = screen.getByRole("menu");

    fireEvent.mouseLeave(accountMenu);
    fireEvent.mouseEnter(menu);
    act(() => vi.advanceTimersByTime(151));

    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
  });

  it("opens the account menu with keyboard focus", () => {
    render(<MemoryRouter><NavContent /></MemoryRouter>);

    fireEvent.focus(screen.getByRole("button", { name: "Account menu for Alex Admin" }));

    expect(screen.getByRole("menuitem", { name: "Settings" })).toBeInTheDocument();
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

  it("clears a pending hover-close timer when unmounted", () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { unmount } = render(<MemoryRouter><NavContent /></MemoryRouter>);
    const accountMenu = screen.getByRole("button", { name: "Account menu for Alex Admin" });

    fireEvent.mouseEnter(accountMenu);
    fireEvent.mouseLeave(accountMenu);
    const profileTimerIndex = setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === 150);
    expect(profileTimerIndex).toBeGreaterThanOrEqual(0);
    const profileTimer = setTimeoutSpy.mock.results[profileTimerIndex]?.value;

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(profileTimer);
  });
});
