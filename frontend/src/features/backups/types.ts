export type StepUpMethod = "password" | "google";

export interface StepUpInput {
  method: StepUpMethod;
  credential: string;
}

export interface BackupManifest {
  format_version: number;
  application: string;
  created_at: string;
  schema_revisions: string[];
  postgres_server_version: string;
  postgres_client_version: string;
  dump_sha256: string;
  dump_bytes: number;
  table_counts: Record<string, number>;
  active_admin_count: number;
}

export interface BackupCapabilities {
  available: boolean;
  pg_dump_version?: string | null;
  pg_restore_version?: string | null;
  server_version?: string | null;
  reason?: string | null;
}

export interface ExportInput {
  passphrase: string;
  confirmPassphrase: string;
  stepUp: StepUpInput;
}

export interface DownloadResult {
  blob: Blob;
  filename: string;
}

export interface InspectInput {
  file: File;
  passphrase: string;
}

export interface InspectResult {
  manifest: BackupManifest;
  restore_token: string;
}

export interface RestoreInput extends InspectInput {
  restoreToken: string;
  confirmation: string;
  stepUp: StepUpInput;
}
