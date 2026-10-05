import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--success-bg": "color-mix(in srgb, var(--success) 10%, var(--popover))",
          "--success-border": "color-mix(in srgb, var(--success) 25%, transparent)",
          "--success-text": "var(--success)",
          "--error-bg": "color-mix(in srgb, var(--destructive) 10%, var(--popover))",
          "--error-border": "color-mix(in srgb, var(--destructive) 25%, transparent)",
          "--error-text": "var(--destructive)",
          "--warning-bg": "color-mix(in srgb, var(--warning) 10%, var(--popover))",
          "--warning-border": "color-mix(in srgb, var(--warning) 25%, transparent)",
          "--warning-text": "var(--warning)",
          "--info-bg": "color-mix(in srgb, var(--primary) 10%, var(--popover))",
          "--info-border": "color-mix(in srgb, var(--primary) 25%, transparent)",
          "--info-text": "var(--primary)",
        } as React.CSSProperties
      }
      richColors
      {...props}
    />
  )
}

export { Toaster }
