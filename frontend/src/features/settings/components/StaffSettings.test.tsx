import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StaffSettings } from "./StaffSettings";

const mocks = vi.hoisted(() => ({
  profileMutate: vi.fn(),
  passwordMutate: vi.fn(),
  user: {
    id: "u1",
    username: "Library Admin",
    email: "admin@booky.test",
    avatar_url: "https://cdn.example.com/avatar.png",
    role: "admin" as const,
    is_google_account: false as boolean,
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user }),
  useUpdateUserProfile: () => ({ mutate: mocks.profileMutate, isPending: false }),
  useChangePassword: () => ({ mutate: mocks.passwordMutate, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

describe("StaffSettings", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.profileMutate.mockReset();
    mocks.passwordMutate.mockReset();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    mocks.user.is_google_account = false;
  });

  it("renders the Figma settings cards and saves a trimmed display name", async () => {
    const user = userEvent.setup();
    render(<StaffSettings />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Settings", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText("Workspace / Settings")).not.toBeInTheDocument();
    expect(screen.getByText("Profile details")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Password & security")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeDisabled();

    const name = screen.getByLabelText("Display name");
    await user.clear(name);
    await user.type(name, "  Head Librarian  ");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const formData = mocks.profileMutate.mock.calls[0][0] as FormData;
    expect(formData.get("username")).toBe("Head Librarian");
  });

  it("applies a selected theme and sends explicit avatar removal", async () => {
    const user = userEvent.setup();
    render(<StaffSettings />);

    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("booky-theme")).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Remove photo" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    const formData = mocks.profileMutate.mock.calls[0][0] as FormData;
    expect(formData.get("remove_avatar")).toBe("true");
  });

  it("blocks mismatched passwords and submits valid values", async () => {
    const user = userEvent.setup();
    render(<StaffSettings />);

    await user.type(screen.getByLabelText("Current password"), "current-pass");
    await user.type(screen.getByLabelText("New password"), "new-password");
    await user.type(screen.getByLabelText("Confirm new password"), "different");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(mocks.passwordMutate).not.toHaveBeenCalled();
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Confirm new password"));
    await user.type(screen.getByLabelText("Confirm new password"), "new-password");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(mocks.passwordMutate).toHaveBeenCalledWith(
      {
        current_password: "current-pass",
        new_password: "new-password",
        confirm_password: "new-password",
      },
      expect.any(Object),
    );
  });

  it("rejects unsupported photo files before profile submission", () => {
    render(<StaffSettings />);
    const input = screen.getByLabelText("Choose profile photo");
    fireEvent.change(input, {
      target: { files: [new File(["gif"], "avatar.gif", { type: "image/gif" })] },
    });
    expect(screen.getByText(/JPEG, PNG, or WebP/)).toBeInTheDocument();
  });

  it("shows provider-managed security without password inputs for Google accounts", () => {
    mocks.user.is_google_account = true;
    render(<StaffSettings />);

    expect(screen.getByText("Password managed by Google")).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
  });

  it("uses responsive readable typography throughout the settings page", () => {
    render(<StaffSettings />);

    expect(screen.getByRole("heading", { name: "Settings" })).toHaveClass("text-2xl", "sm:text-3xl", "lg:text-4xl");
    expect(screen.getByText("Manage your profile and personalize your library workspace.")).toHaveClass("text-sm", "sm:text-base", "lg:text-lg");
    expect(screen.getByRole("heading", { name: "Profile details" })).toHaveClass("text-lg", "sm:text-xl");
    expect(screen.getByRole("heading", { name: "Appearance" })).toHaveClass("text-lg", "sm:text-xl");
    expect(screen.getByRole("heading", { name: "Password & security" })).toHaveClass("text-lg", "sm:text-xl");
    expect(screen.getByText("Your staff identity across Pahina.")).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByText("JPEG, PNG or WebP. Maximum 2 MB.")).toHaveClass("text-xs", "sm:text-sm");
    expect(screen.getByText("Display name")).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByLabelText("Display name")).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByRole("radio", { name: "Light" }).querySelector("span.text-sm")).toHaveClass("sm:text-base");
    expect(screen.getByRole("button", { name: "Update password" })).toHaveClass("text-sm", "sm:text-base");
    expect(screen.getByRole("button", { name: "Save changes" })).toHaveClass("text-sm", "sm:text-base");
  });
});
