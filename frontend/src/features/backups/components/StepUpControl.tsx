import { GoogleLogin } from "@react-oauth/google";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsDarkTheme } from "@/hooks/useIsDarkTheme";
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
  const isDark = useIsDarkTheme();

  if (googleAccount) {
    return (
      <div className="space-y-2" aria-disabled={disabled}>
        <Label>Verify your Google account for {labelSuffix}</Label>
        {/* colorScheme "light" matches the iframe's own document. Without it,
            dark mode's color-scheme makes Chrome paint an opaque white backdrop
            behind the iframe, visible around the pill's rounded corners. */}
        <div className={disabled ? "pointer-events-none opacity-50" : ""} style={{ colorScheme: "light" }}>
          {/* Google renders this button in an iframe, so CSS can't theme it;
              pick its dark or light variant and remount when the theme flips. */}
          <GoogleLogin
            key={isDark ? "dark" : "light"}
            theme={isDark ? "filled_black" : "outline"}
            shape="pill"
            size="large"
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
