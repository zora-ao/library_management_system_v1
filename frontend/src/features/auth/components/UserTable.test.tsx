import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UserTable from "./UserTable";

const updateRole = vi.fn();
const updateStatus = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin-1", username: "Alex Admin", email: "alex@test.dev", role: "admin", avatar_url: "", is_active: true } }),
  useGetAllUsers: () => ({ data: [
    { id: "admin-1", username: "Alex Admin", email: "alex@test.dev", role: "admin", avatar_url: "", is_active: true, created_at: "2026-10-20T00:00:00Z" },
    { id: "student-1", username: "Bianca Student", email: "bianca@test.dev", role: "student", avatar_url: "", is_active: true, created_at: "2026-10-19T00:00:00Z" },
    { id: "librarian-1", username: "Carlo Librarian", email: "carlo@test.dev", role: "librarian", avatar_url: "", is_active: false, created_at: "2026-10-18T00:00:00Z" },
  ], isLoading: false, isError: false }),
  useUpdateUserRole: () => ({ mutate: updateRole, isPending: false }),
  useUpdateUserActiveStatus: () => ({ mutate: updateStatus, isPending: false }),
}));

vi.mock("@/hooks/useBorrows", () => ({
  useAdminBorrows: () => ({ data: [{
    id: "borrow-1", user_id: "student-1", book_id: "book-1", book_title: "The Midnight Library",
    book_available_copies: 1, borrowed_at: "2026-10-01T00:00:00Z", due_date: "2026-10-15T00:00:00Z",
    approved_at: "2026-10-01T00:00:00Z", rejection_reason: null, returned_at: null,
    status: "OVERDUE", is_overdue: true,
  }], isLoading: false, isError: false }),
}));

describe("admin users workspace", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("shows Figma summary cards and marks the signed-in user", () => {
    render(<UserTable />);
    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByText("Alex Admin · You")).toBeInTheDocument();
    expect(screen.getByText("Total users").parentElement).toHaveTextContent("3");
    expect(screen.getAllByText("Students")[0].parentElement).toHaveTextContent("1");
    expect(screen.getByText("Staff accounts").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Inactive account").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Showing 1–3 of 3 users")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("matches the borrow request page spacing and table surfaces", () => {
    render(<UserTable />);

    const page = screen.getByRole("heading", { name: "Users" }).closest("header")?.parentElement;
    const card = screen.getByText("Total users").parentElement?.parentElement?.parentElement;
    const workspace = screen.getByRole("searchbox", { name: "Search users" }).closest("section");
    const filterSection = screen.getByRole("searchbox", { name: "Search users" }).closest("div")?.parentElement;
    const headerRow = screen.getByRole("columnheader", { name: "Member" }).closest("tr");
    const userRow = screen.getByText("Alex Admin · You").closest("tr");

    expect(page).toHaveClass("w-full", "space-y-7", "pb-10");
    expect(page).not.toHaveClass("mx-auto", "max-w-[1440px]");
    expect(card).toHaveClass("rounded-3xl", "border-border/70", "bg-card", "shadow-[var(--glass-shadow)]");
    expect(workspace).toHaveClass("overflow-hidden", "rounded-3xl", "border-border/70", "bg-card");
    expect(filterSection).toHaveClass("border-b", "border-border", "p-5");
    expect(headerRow).toHaveClass("border-border", "bg-muted/60");
    expect(userRow).toHaveClass("border-border/60", "bg-card/30");
  });

  it("uses responsive typography for page controls and table details", () => {
    render(<UserTable />);
    const alexRow = screen.getByText("Alex Admin · You").closest("tr");
    expect(alexRow).not.toBeNull();

    expect(screen.getByRole("heading", { name: "Users" })).toHaveClass("text-2xl", "sm:text-3xl", "lg:text-4xl");
    expect(screen.getByText("Manage accounts, roles, and access to your library.")).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByRole("searchbox", { name: "Search users" })).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByRole("combobox", { name: "Filter by role" })).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByRole("columnheader", { name: "Member" })).not.toHaveClass("text-xs", "uppercase");
    expect(within(alexRow!).getByText("alex@test.dev")).toHaveClass("text-xs", "sm:text-sm");
  });

  it("opens a profile drawer with loans and account actions", async () => {
    const user = userEvent.setup();
    render(<UserTable />);
    await user.click(screen.getByRole("button", { name: "View Bianca Student details" }));
    const profileDialog = screen.getByRole("heading", { name: "User profile" }).closest<HTMLElement>("[role=dialog]");
    expect(profileDialog).not.toBeNull();
    expect(profileDialog).toHaveClass("!bg-popover", "!text-popover-foreground", "!backdrop-blur-none");
    expect(profileDialog).not.toHaveClass("!bg-black", "!text-white");
    expect(within(profileDialog!).getByRole("heading", { name: "Bianca Student" })).toHaveClass("text-xl", "sm:text-2xl");
    expect(within(profileDialog!).getByText("bianca@test.dev")).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByText("The Midnight Library")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change role" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Deactivate account" }));
    const confirmation = screen.getByRole("dialog", { name: "Deactivate Bianca Student’s account?" });
    expect(confirmation).toHaveClass("bg-popover", "text-popover-foreground", "sm:max-w-md");
    expect(screen.getByRole("heading", { name: "Deactivate Bianca Student’s account?" })).toHaveClass("text-xl", "sm:text-2xl", "text-foreground");
  });

  it("does not expose account actions for the signed-in admin", async () => {
    const user = userEvent.setup();
    render(<UserTable />);
    await user.click(screen.getByRole("button", { name: "View Alex Admin details" }));
    expect(screen.getByText("This is your signed-in account.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change role" })).not.toBeInTheDocument();
  });

  it("shows the current role in the shared select", async () => {
    const user = userEvent.setup();
    render(<UserTable />);
    await user.click(screen.getByRole("button", { name: "View Bianca Student details" }));
    await user.click(screen.getByRole("button", { name: "Change role" }));

    const roleDialog = screen.getByRole("dialog", { name: "Change user role" });
    const roleSelect = within(roleDialog).getByRole("combobox", { name: "Account role" });
    expect(roleSelect).toHaveTextContent("Student");
    expect(roleSelect).toHaveClass("data-[size=default]:h-11");
    expect(within(roleDialog).getByRole("button", { name: "Save role" })).toBeDisabled();

    roleSelect.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("submits a role selected from the shared dropdown", async () => {
    const user = userEvent.setup();
    render(<UserTable />);
    await user.click(screen.getByRole("button", { name: "View Bianca Student details" }));
    await user.click(screen.getByRole("button", { name: "Change role" }));
    const roleDialog = screen.getByRole("dialog", { name: "Change user role" });

    const roleSelect = within(roleDialog).getByRole("combobox", { name: "Account role" });
    roleSelect.focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("option", { name: "Librarian" }));
    expect(updateRole).not.toHaveBeenCalled();

    await user.click(within(roleDialog).getByRole("button", { name: "Save role" }));
    expect(updateRole).toHaveBeenCalledOnce();
    expect(updateRole).toHaveBeenCalledWith(
      { userId: "student-1", role: "librarian" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("discards an unsaved role selection", async () => {
    const user = userEvent.setup();
    render(<UserTable />);
    await user.click(screen.getByRole("button", { name: "View Bianca Student details" }));
    await user.click(screen.getByRole("button", { name: "Change role" }));
    let roleDialog = screen.getByRole("dialog", { name: "Change user role" });
    const roleSelect = within(roleDialog).getByRole("combobox", { name: "Account role" });
    roleSelect.focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("option", { name: "Librarian" }));
    await user.click(within(roleDialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Change role" }));
    roleDialog = screen.getByRole("dialog", { name: "Change user role" });
    expect(within(roleDialog).getByRole("combobox", { name: "Account role" })).toHaveTextContent("Student");
    expect(within(roleDialog).getByRole("button", { name: "Save role" })).toBeDisabled();
    expect(updateRole).not.toHaveBeenCalled();
  });

  it("supports keyboard role selection", async () => {
    const user = userEvent.setup();
    render(<UserTable />);
    await user.click(screen.getByRole("button", { name: "View Bianca Student details" }));
    await user.click(screen.getByRole("button", { name: "Change role" }));
    const roleDialog = screen.getByRole("dialog", { name: "Change user role" });
    const roleSelect = within(roleDialog).getByRole("combobox", { name: "Account role" });

    roleSelect.focus();
    await user.keyboard("{Enter}{ArrowDown}{Enter}");

    expect(roleSelect).toHaveTextContent("Librarian");
  });
});
