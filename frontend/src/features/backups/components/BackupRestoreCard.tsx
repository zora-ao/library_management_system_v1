import { useState } from "react";
import { DatabaseZap, FileCheck2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { inspectBackup, restoreBackup } from "../api";
import type { InspectResult, StepUpInput } from "../types";
import { StepUpControl } from "./StepUpControl";


type RestoreStatus = "idle" | "validating" | "ready" | "restoring" | "complete";

interface BackupRestoreCardProps {
  enabled: boolean;
  googleAccount: boolean;
  safetyToken: string;
}


function errorMessage(error: unknown): string {
  return (error as { response?: { data?: { message?: string } }; message?: string })
    ?.response?.data?.message
    ?? (error as { message?: string })?.message
    ?? "Backup operation failed";
}


export function BackupRestoreCard({ enabled, googleAccount, safetyToken }: BackupRestoreCardProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [inspection, setInspection] = useState<InspectResult | null>(null);
  const [status, setStatus] = useState<RestoreStatus>("idle");
  const [confirmation, setConfirmation] = useState("");
  const [stepUp, setStepUp] = useState<StepUpInput>({
    method: googleAccount ? "google" : "password",
    credential: "",
  });
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const busy = status === "validating" || status === "restoring";
  const canValidate = enabled && Boolean(file) && passphrase.length >= 12 && !busy;
  const canRestore = enabled
    && status === "ready"
    && Boolean(inspection && safetyToken)
    && confirmation === "RESTORE DATABASE"
    && Boolean(stepUp.credential);

  const resetInspection = () => {
    setInspection(null);
    setStatus("idle");
    setConfirmation("");
    setDialogOpen(false);
  };

  const validate = async () => {
    if (!file || !canValidate) return;
    setStatus("validating");
    setInspection(null);
    setError("");
    try {
      const result = await inspectBackup({ file, passphrase });
      setInspection(result);
      setStatus("ready");
    } catch (caught) {
      resetInspection();
      setError(errorMessage(caught));
    }
  };

  const restore = async () => {
    if (!file || !inspection || !canRestore) return;
    setStatus("restoring");
    setError("");
    try {
      await restoreBackup({
        file,
        passphrase,
        restoreToken: inspection.restore_token,
        safetyToken,
        confirmation,
        stepUp,
      });
      setStatus("complete");
      logout();
      navigate("/login?restored=1", { replace: true });
    } catch (caught) {
      setStatus("idle");
      setInspection(null);
      setFile(null);
      setPassphrase("");
      setConfirmation("");
      setError(`${errorMessage(caught)} Sign in again before attempting another restore.`);
      logout();
      navigate("/login", { replace: true });
    } finally {
      setStepUp({ method: googleAccount ? "google" : "password", credential: "" });
      setDialogOpen(false);
    }
  };

  return (
    <Card className="booky-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <DatabaseZap className="size-5 text-destructive" /> Validate and restore
        </CardTitle>
        <CardDescription>
          Validate an encrypted backup first, review its authenticated metadata, then replace the current database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="restore-file">Backup file</Label>
          <Input id="restore-file" type="file" accept=".pahina-backup" disabled={!enabled || busy} onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            resetInspection();
          }} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="restore-passphrase">Passphrase for selected backup</Label>
          <Input id="restore-passphrase" type="password" autoComplete="off" value={passphrase} disabled={!enabled || busy} onChange={(event) => {
            setPassphrase(event.target.value);
            resetInspection();
          }} />
        </div>
        <Button variant="outline" className="w-full" disabled={!canValidate} onClick={validate}>
          {status === "validating" ? "Validating encrypted backup…" : "Validate backup"}
        </Button>

        {inspection && (
          <section aria-label="Authenticated backup metadata" className="rounded-xl border border-success/30 bg-success-soft p-4">
            <p className="flex items-center gap-2 font-semibold"><FileCheck2 className="size-4" /> Authenticated backup metadata</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Created</dt><dd>{new Date(inspection.manifest.created_at).toLocaleString()}</dd></div>
              <div><dt className="text-muted-foreground">Active admins</dt><dd>{inspection.manifest.active_admin_count}</dd></div>
              {Object.entries(inspection.manifest.table_counts).map(([table, count]) => (
                <div key={table}><dt className="capitalize text-muted-foreground">{table}</dt><dd>{count}</dd></div>
              ))}
            </dl>
          </section>
        )}

        {inspection && (
          <>
            {!safetyToken && <p className="text-sm text-warning">Download a fresh backup in this session before restoring.</p>}
            <div className="space-y-2">
              <Label htmlFor="restore-confirmation">Type RESTORE DATABASE</Label>
              <Input id="restore-confirmation" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} />
            </div>
            <StepUpControl googleAccount={googleAccount} value={stepUp} onChange={setStepUp} labelSuffix="restore" disabled={busy} />
          </>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button variant="destructive" size="lg" className="w-full" disabled={!canRestore} onClick={() => setDialogOpen(true)}>
          {status === "restoring" ? "Restoring database…" : "Restore database"}
        </Button>
      </CardContent>
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Replace the current database?"
        description="Pahina will enter maintenance mode, replace all database data, and sign everyone out. This cannot be undone."
        confirmLabel="Restore now"
        variant="destructive"
        loading={status === "restoring"}
        onConfirm={restore}
      />
    </Card>
  );
}
