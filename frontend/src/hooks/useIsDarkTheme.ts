import { useSyncExternalStore } from "react";

// The app's theme is the "dark" class on <html> (see features/settings/lib/theme.ts).
// Components that can't be styled with CSS, like Google's sign-in iframe, read it here.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function useIsDarkTheme(): boolean {
  return useSyncExternalStore(subscribe, isDark, () => false);
}
