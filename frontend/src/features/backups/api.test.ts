import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  api: mocks,
}));

import {
  downloadBackup,
  getBackupCapabilities,
  inspectBackup,
  restoreBackup,
} from "./api";


describe("database backup API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches capabilities without cache parameters", async () => {
    const capabilities = { available: true, server_version: "17.4" };
    mocks.get.mockResolvedValue({ data: capabilities });

    await expect(getBackupCapabilities()).resolves.toEqual(capabilities);
    expect(mocks.get).toHaveBeenCalledOnce();
    expect(mocks.get).toHaveBeenCalledWith("/admin/backups/capabilities");
  });

  it.each([
    ['attachment; filename="pahina backup.pahina-backup"', "pahina backup.pahina-backup"],
    ["attachment; filename=pahina-backup.pahina-backup", "pahina-backup.pahina-backup"],
    ['attachment; filename="../unsafe.pahina-backup"', "unsafe.pahina-backup"],
    ['attachment; filename="bad\u0000name.pahina-backup"', "badname.pahina-backup"],
  ])("downloads a blob and safely parses %s", async (disposition, expectedFilename) => {
    const blob = new Blob(["encrypted"]);
    mocks.post.mockResolvedValue({
      data: blob,
      headers: { "content-disposition": disposition },
    });

    await expect(downloadBackup({
      passphrase: "long-enough-passphrase",
      confirmPassphrase: "long-enough-passphrase",
      stepUp: { method: "password", credential: "secret" },
    })).resolves.toEqual({ blob, filename: expectedFilename });

    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.post).toHaveBeenCalledWith(
      "/admin/backups/export",
      {
        passphrase: "long-enough-passphrase",
        confirm_passphrase: "long-enough-passphrase",
        step_up: { method: "password", credential: "secret" },
      },
      { responseType: "blob" },
    );
  });

  it("inspects with one multipart request and no secrets in the URL", async () => {
    const file = new File(["encrypted"], "selected.pahina-backup");
    const result = { manifest: { application: "pahina-library" }, restore_token: "restore" };
    mocks.post.mockResolvedValue({ data: result });

    await expect(inspectBackup({ file, passphrase: "private-passphrase" })).resolves.toEqual(result);
    expect(mocks.post).toHaveBeenCalledOnce();
    const [url, body] = mocks.post.mock.calls[0];
    expect(url).toBe("/admin/backups/inspect");
    expect(url).not.toContain("private-passphrase");
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("backup")).toBe(file);
    expect(body.get("passphrase")).toBe("private-passphrase");
    expect(mocks.post.mock.calls[0][2]).toEqual({
      headers: { "Content-Type": undefined },
    });
  });

  it("restores with the exact multipart fields in one request", async () => {
    const file = new File(["encrypted"], "selected.pahina-backup");
    mocks.post.mockResolvedValue({ data: { message: "Database restored successfully" } });

    const result = await restoreBackup({
      file,
      passphrase: "private-passphrase",
      restoreToken: "restore-token",
      confirmation: "RESTORE DATABASE",
      stepUp: { method: "google", credential: "google-credential" },
    });

    expect(result.message).toMatch(/restored/i);
    expect(mocks.post).toHaveBeenCalledOnce();
    const [url, body] = mocks.post.mock.calls[0];
    expect(url).toBe("/admin/backups/restore");
    expect(url).not.toContain("private-passphrase");
    expect(body).toBeInstanceOf(FormData);
    expect(Object.fromEntries(body.entries())).toMatchObject({
      passphrase: "private-passphrase",
      restore_token: "restore-token",
      confirmation: "RESTORE DATABASE",
      step_up_method: "google",
      step_up_credential: "google-credential",
    });
    expect(body.has("safety_token")).toBe(false);
    expect(body.get("backup")).toBe(file);
    expect(mocks.post.mock.calls[0][2]).toEqual({
      headers: { "Content-Type": undefined },
    });
  });
});
