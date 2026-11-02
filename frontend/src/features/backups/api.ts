import { api } from "@/services/api";
import type {
  BackupCapabilities,
  DownloadResult,
  ExportInput,
  InspectInput,
  InspectResult,
  RestoreInput,
} from "./types";


const DEFAULT_BACKUP_FILENAME = "pahina-database-backup.pahina-backup";


function responseHeader(
  headers: { get?: (name: string) => unknown; [name: string]: unknown },
  name: string,
): string | undefined {
  const value = typeof headers.get === "function"
    ? headers.get(name)
    : headers[name.toLowerCase()] ?? headers[name];
  return typeof value === "string" && value.trim() ? value : undefined;
}


function safeDownloadFilename(disposition?: string): string {
  if (!disposition) return DEFAULT_BACKUP_FILENAME;

  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const ordinary = disposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
  let candidate = encoded
    ? decodeURIComponent(encoded)
    : ordinary?.[1] ?? ordinary?.[2] ?? DEFAULT_BACKUP_FILENAME;
  candidate = candidate.split(/[\\/]/).pop()?.trim() || DEFAULT_BACKUP_FILENAME;
  return candidate.replace(/[\u0000-\u001f\u007f]/g, "") || DEFAULT_BACKUP_FILENAME;
}


export async function getBackupCapabilities(): Promise<BackupCapabilities> {
  const { data } = await api.get<BackupCapabilities>("/admin/backups/capabilities");
  return data;
}


export async function downloadBackup(input: ExportInput): Promise<DownloadResult> {
  const response = await api.post<Blob>(
    "/admin/backups/export",
    {
      passphrase: input.passphrase,
      confirm_passphrase: input.confirmPassphrase,
      step_up: input.stepUp,
    },
    { responseType: "blob" },
  );
  const safetyToken = responseHeader(response.headers, "x-backup-safety-token");
  if (!safetyToken) {
    throw new Error("Backup response did not include a safety token");
  }
  return {
    blob: response.data,
    filename: safeDownloadFilename(
      responseHeader(response.headers, "content-disposition"),
    ),
    safetyToken,
  };
}


export async function inspectBackup(input: InspectInput): Promise<InspectResult> {
  const body = new FormData();
  body.append("backup", input.file);
  body.append("passphrase", input.passphrase);
  const { data } = await api.post<InspectResult>("/admin/backups/inspect", body);
  return data;
}


export async function restoreBackup(
  input: RestoreInput,
): Promise<{ message: string }> {
  const body = new FormData();
  body.append("backup", input.file);
  body.append("passphrase", input.passphrase);
  body.append("restore_token", input.restoreToken);
  body.append("safety_token", input.safetyToken);
  body.append("confirmation", input.confirmation);
  body.append("step_up_method", input.stepUp.method);
  body.append("step_up_credential", input.stepUp.credential);
  const { data } = await api.post<{ message: string }>(
    "/admin/backups/restore",
    body,
  );
  return data;
}
