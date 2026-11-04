import { useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadBackup } from "../api";
import type { StepUpInput } from "../types";
import { StepUpControl } from "./StepUpControl";


interface BackupDownloadCardProps {
  enabled: boolean;
  googleAccount: boolean;
  onSafetyToken: (token: string) => void;
}


function errorMessage(error: unknown): string {
  return (error as { response?: { data?: { message?: string } }; message?: string })
    ?.response?.data?.message
    ?? (error as { message?: string })?.message
    ?? "Backup download failed";
}


export function BackupDownloadCard({
  enabled,
  googleAccount,
  onSafetyToken,
}: BackupDownloadCardProps) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [stepUp, setStepUp] = useState<StepUpInput>({
    method: googleAccount ? "google" : "password",
    credential: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  const valid = enabled
    && passphrase.length >= 12
    && passphrase === confirmation
    && Boolean(stepUp.credential)
    && !pending;

  const handleDownload = async () => {
    if (!valid) return;
    setPending(true);
    setError("");
    setDownloaded(false);
    try {
      const result = await downloadBackup({
        passphrase,
        confirmPassphrase: confirmation,
        stepUp,
      });
      const url = URL.createObjectURL(result.blob);
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = result.filename;
        anchor.click();
      } finally {
        URL.revokeObjectURL(url);
      }
      onSafetyToken(result.safetyToken);
      setDownloaded(true);
      setPassphrase("");
      setConfirmation("");
    } catch (caught) {
      onSafetyToken("");
      setError(errorMessage(caught));
    } finally {
      setStepUp({ method: googleAccount ? "google" : "password", credential: "" });
      setPending(false);
    }
  };

  return (
    <Card className="booky-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Download className="size-5 text-primary" /> Download backup
        </CardTitle>
        <CardDescription>
          Create an encrypted, database-only backup file. Images and uploaded files are not included.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm">
          Keep the passphrase somewhere secure. It cannot be recovered by Pahina.
        </div>
        <div className="space-y-2">
          <Label htmlFor="backup-passphrase">Backup passphrase</Label>
          <Input id="backup-passphrase" type="password" autoComplete="new-password" value={passphrase} disabled={!enabled || pending} onChange={(event) => setPassphrase(event.target.value)} />
          <p className="text-xs text-muted-foreground">Use at least 12 characters.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="backup-confirm-passphrase">Confirm backup passphrase</Label>
          <Input id="backup-confirm-passphrase" type="password" autoComplete="new-password" value={confirmation} disabled={!enabled || pending} onChange={(event) => setConfirmation(event.target.value)} />
        </div>
        <StepUpControl googleAccount={googleAccount} value={stepUp} onChange={setStepUp} labelSuffix="backup" disabled={!enabled || pending} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {downloaded && (
          <p className="flex items-center gap-2 text-sm text-success">
            <ShieldCheck className="size-4" /> A fresh safety download is ready for restore verification.
          </p>
        )}
        <Button
          size="lg"
          className="h-auto min-h-9 w-full whitespace-normal py-2 text-center"
          disabled={!valid}
          onClick={handleDownload}
        >
          {pending
            ? "Creating the PostgreSQL archive and encrypting it before download begins…"
            : "Download encrypted backup"}
        </Button>
      </CardContent>
    </Card>
  );
}
