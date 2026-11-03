import { useEffect, useState } from "react";
import { Database, ShieldAlert } from "lucide-react";
import { BackupDownloadCard } from "@/features/backups/components/BackupDownloadCard";
import { BackupRestoreCard } from "@/features/backups/components/BackupRestoreCard";
import { getBackupCapabilities } from "@/features/backups/api";
import type { BackupCapabilities } from "@/features/backups/types";
import { useAuth } from "@/hooks/useAuth";


export default function DataBackupsPage() {
  const { user } = useAuth();
  const [capabilities, setCapabilities] = useState<BackupCapabilities | null>(null);
  const [capabilityError, setCapabilityError] = useState("");
  const [safetyToken, setSafetyToken] = useState("");

  useEffect(() => {
    let active = true;
    getBackupCapabilities()
      .then((result) => {
        if (active) setCapabilities(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setCapabilityError(
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? "Database backup tools are unavailable",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const enabled = capabilities?.available === true && !capabilityError;
  const unavailableReason = capabilityError || (capabilities && !capabilities.available
    ? capabilities.reason || "Database backup tools are unavailable"
    : "");
  const googleAccount = user?.is_google_account === true;

  return (
    <section className="w-full space-y-6 pb-10">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
          <Database className="size-4" /> Administration
        </div>
        <h1 className="booky-heading text-3xl tracking-tight sm:text-4xl">Data backups</h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Download or restore encrypted database data only. Book covers, avatars, and other uploaded files are outside this backup.
        </p>
      </header>

      {unavailableReason && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div><strong>Backup actions are disabled.</strong><p>{unavailableReason}</p></div>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <BackupDownloadCard enabled={enabled} googleAccount={googleAccount} onSafetyToken={setSafetyToken} />
        <BackupRestoreCard enabled={enabled} googleAccount={googleAccount} safetyToken={safetyToken} />
      </div>
    </section>
  );
}
