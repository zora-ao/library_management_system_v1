import { GoogleLogin } from "@react-oauth/google";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StepUpInput } from "../types";


interface StepUpControlProps {
  googleAccount: boolean;
  value: StepUpInput;
  onChange: (value: StepUpInput) => void;
  labelSuffix: string;
  disabled?: boolean;
}


export function StepUpControl({
  googleAccount,
  value,
  onChange,
  labelSuffix,
  disabled = false,
}: StepUpControlProps) {
  if (googleAccount) {
    return (
      <div className="space-y-2" aria-disabled={disabled}>
        <Label>Verify your Google account for {labelSuffix}</Label>
        <div className={disabled ? "pointer-events-none opacity-50" : ""}>
          <GoogleLogin
            onSuccess={(response) => onChange({
              method: "google",
              credential: response.credential ?? "",
            })}
            onError={() => onChange({ method: "google", credential: "" })}
          />
        </div>
        {value.credential && (
          <p className="text-sm text-success">Google verification is ready.</p>
        )}
      </div>
    );
  }

  const id = `step-up-${labelSuffix.replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Current password for {labelSuffix}</Label>
      <Input
        id={id}
        type="password"
        autoComplete="current-password"
        value={value.credential}
        disabled={disabled}
        onChange={(event) => onChange({
          method: "password",
          credential: event.target.value,
        })}
      />
    </div>
  );
}
