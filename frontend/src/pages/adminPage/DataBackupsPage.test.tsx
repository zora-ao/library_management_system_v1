import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capabilities: vi.fn(),
  download: vi.fn(),
  inspect: vi.fn(),
  restore: vi.fn(),
  logout: vi.fn(),
  navigate: vi.fn(),
  user: { role: "admin", is_google_account: false } as {
    role: "admin";
    is_google_account: boolean;
  },
}));

vi.mock("@/features/backups/api", () => ({
  getBackupCapabilities: mocks.capabilities,
  downloadBackup: mocks.download,
  inspectBackup: mocks.inspect,
  restoreBackup: mocks.restore,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, logout: mocks.logout }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("@react-oauth/google", () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (value: { credential: string }) => void }) => (
    <button onClick={() => onSuccess({ credential: "google-step-up" })}>
      Verify with Google
    </button>
  ),
}));

import DataBackupsPage from "./DataBackupsPage";


const manifest = {
  format_version: 1,
  application: "pahina-library",
  created_at: "2026-11-02T00:00:00Z",
  schema_revisions: ["f6d7e8a9b0c1"],
  postgres_server_version: "17.4",
  postgres_client_version: "17.5",
  dump_sha256: "a".repeat(64),
  dump_bytes: 1200,
  table_counts: { users: 8, books: 42 },
  active_admin_count: 1,
};


describe("DataBackupsPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.is_google_account = false;
    mocks.capabilities.mockResolvedValue({ available: true, server_version: "17.4" });
    mocks.download.mockResolvedValue({
      blob: new Blob(["encrypted"]),
      filename: "pahina-test.pahina-backup",
    });
    mocks.inspect.mockResolvedValue({ manifest, restore_token: "restore-token" });
    mocks.restore.mockResolvedValue({ message: "Database restored successfully" });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:backup");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  it("explains scope and blocks invalid download inputs", async () => {
    const user = userEvent.setup();
    render(<DataBackupsPage />);
    expect(screen.getByText(/database data only/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be recovered/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Backup passphrase"), "long-enough-passphrase");
    await user.type(screen.getByLabelText("Confirm backup passphrase"), "different-passphrase");
    await user.type(screen.getByLabelText("Current password for backup"), "password");
    expect(screen.getByRole("button", { name: /download encrypted backup/i })).toBeDisabled();
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("disables backup actions when server capabilities are unavailable", async () => {
    mocks.capabilities.mockResolvedValue({ available: false, reason: "pg_dump is missing" });
    render(<DataBackupsPage />);
    expect(await screen.findByText(/pg_dump is missing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download encrypted backup/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /validate backup/i })).toBeDisabled();
  });

  it("downloads once, uses the server filename, and revokes its object URL", async () => {
    const click = vi.mocked(HTMLAnchorElement.prototype.click);
    const user = userEvent.setup();
    render(<DataBackupsPage />);
    await waitFor(() => expect(screen.getByLabelText("Backup passphrase")).toBeEnabled());
    await user.type(screen.getByLabelText("Backup passphrase"), "long-enough-passphrase");
    await user.type(screen.getByLabelText("Confirm backup passphrase"), "long-enough-passphrase");
    await user.type(screen.getByLabelText("Current password for backup"), "password");
    await user.click(screen.getByRole("button", { name: /download encrypted backup/i }));

    await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce());
    expect(click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:backup");
    expect(screen.getByText(/backup downloaded/i)).toBeInTheDocument();
  });

  it("accurately describes backup preparation while export is pending", async () => {
    let finishDownload: ((result: {
      blob: Blob;
      filename: string;
    }) => void) | undefined;
    mocks.download.mockImplementation(() => new Promise((resolve) => {
      finishDownload = resolve;
    }));
    const user = userEvent.setup();
    render(<DataBackupsPage />);
    await waitFor(() => expect(screen.getByLabelText("Backup passphrase")).toBeEnabled());
    await user.type(screen.getByLabelText("Backup passphrase"), "long-enough-passphrase");
    await user.type(screen.getByLabelText("Confirm backup passphrase"), "long-enough-passphrase");
    await user.type(screen.getByLabelText("Current password for backup"), "password");

    await user.click(screen.getByRole("button", { name: /download encrypted backup/i }));

    const pendingButton = screen.getByRole("button", {
      name: /creating the postgresql archive and encrypting it before download begins/i,
    });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveClass("h-auto", "min-h-9", "whitespace-normal");

    await act(async () => {
      finishDownload?.({
        blob: new Blob(["encrypted"]),
        filename: "pahina-test.pahina-backup",
      });
    });
    await waitFor(() => expect(screen.getByRole("button", {
      name: /download encrypted backup/i,
    })).toBeDisabled());
    expect(screen.getByLabelText("Backup passphrase")).toHaveValue("");
    expect(screen.queryByText(
      /creating the postgresql archive and encrypting it before download begins/i,
    )).not.toBeInTheDocument();
  });

  it("renders Google step-up for Google accounts", async () => {
    mocks.user.is_google_account = true;
    render(<DataBackupsPage />);
    expect(await screen.findByRole("button", { name: "Verify with Google" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password for backup")).not.toBeInTheDocument();
  });

  it("resets readiness after an invalid inspection and does not retry", async () => {
    mocks.inspect.mockRejectedValue({ response: { data: { message: "Backup schema revision does not match" } } });
    const user = userEvent.setup();
    render(<DataBackupsPage />);
    await waitFor(() => expect(screen.getByLabelText("Backup file")).toBeEnabled());
    const file = new File(["encrypted"], "selected.pahina-backup");
    fireEvent.change(screen.getByLabelText("Backup file"), { target: { files: [file] } });
    await user.type(screen.getByLabelText("Passphrase for selected backup"), "long-enough-passphrase");
    await user.click(screen.getByRole("button", { name: /validate backup/i }));

    expect(await screen.findByText(/schema revision does not match/i)).toBeInTheDocument();
    expect(mocks.inspect).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /restore database/i })).toBeDisabled();
  });

  it("validates metadata and restores without a fresh download first", async () => {
    const user = userEvent.setup();
    render(<DataBackupsPage />);

    await waitFor(() => expect(screen.getByLabelText("Backup file")).toBeEnabled());
    const file = new File(["encrypted"], "selected.pahina-backup");
    fireEvent.change(screen.getByLabelText("Backup file"), { target: { files: [file] } });
    await user.type(screen.getByLabelText("Passphrase for selected backup"), "long-enough-passphrase");
    await user.click(screen.getByRole("button", { name: /validate backup/i }));

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText(/authenticated backup metadata/i)).toBeInTheDocument();
    const restoreButton = screen.getByRole("button", { name: /restore database/i });
    expect(restoreButton).toBeDisabled();

    await user.type(screen.getByLabelText("Type RESTORE DATABASE"), "RESTORE DATABASE");
    await user.type(screen.getByLabelText("Current password for restore"), "password");
    expect(restoreButton).toBeEnabled();
    await user.click(restoreButton);
    await user.click(screen.getByRole("button", { name: /restore now/i }));

    await waitFor(() => expect(mocks.restore).toHaveBeenCalledOnce());
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(mocks.navigate).toHaveBeenCalledWith("/login?restored=1", { replace: true });
  });
});
