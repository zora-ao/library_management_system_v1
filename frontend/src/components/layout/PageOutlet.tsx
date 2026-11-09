import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-spinner";

// A page chunk that no longer exists on the server (after a redeploy) fails
// with one of these messages. Reloading fetches the new build.
const CHUNK_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

const isChunkLoadError =(error: unknown) =>
  error instanceof Error && CHUNK_ERROR_PATTERN.test(error.message);

interface PageErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
}

interface PageErrorBoundaryState {
  error: Error | null;
  resetKey: string;
}

export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<PageErrorBoundaryState> {
    return { error };
  }

  // Navigating to another page clears the error so the rest of the app keeps working.
  static getDerivedStateFromProps(
    props: PageErrorBoundaryProps,
    state: PageErrorBoundaryState,
  ): Partial<PageErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) {
      return { error: null, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page crashed", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const outdated = isChunkLoadError(error);
    return (
      <div role="alert" className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-lg font-semibold">
          {outdated ? "A new version is available" : "Something went wrong on this page"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {outdated
            ? "Reload to get the latest version of the library."
            : "Try reloading. If it keeps happening, go back and try another page."}
        </p>
        <Button type="button" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    );
  }
}

export const PageFallback = () => (
  <LoadingState containerClassName="min-h-[50vh]" label="Loading page" />
);

/** Outlet that loads lazy pages and contains any page crash to that page. */
const PageOutlet = () => {
  const { pathname } = useLocation();
  return (
    <PageErrorBoundary resetKey={pathname}>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </PageErrorBoundary>
  );
};

export default PageOutlet;
