import LoginForm from "@/features/auth/components/LoginForm";
import GLogin from "@/features/auth/components/GLogin";
import { Link, useSearchParams } from "react-router-dom";

const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const restored = searchParams.get("restored") === "1";

  return (
  <main className="min-h-svh bg-background p-4 text-foreground sm:p-6">
    <div className="mx-auto grid min-h-[calc(100svh-3rem)] max-w-[1232px] gap-10 lg:grid-cols-[552fr_632fr] lg:gap-12">
      <section
        aria-labelledby="login-welcome"
        className="flex flex-col rounded-[24px] border border-[var(--glass-border)] bg-card/65 px-6 py-8 shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)] sm:px-[39px] lg:min-h-[752px]"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[11px] bg-[#f3cd63] text-primary-foreground shadow-2xs dark:bg-primary">
            <img src="/pahina-logo.svg" alt="" width="40" height="40" />
          </span>
          <span className="text-[25px] font-bold leading-[1.4] tracking-tight text-foreground">Pahina</span>
        </div>
        <h1
          id="login-welcome"
          className="mt-10 text-[36px] font-bold leading-[1.22] tracking-tight text-foreground sm:mt-[61px] sm:text-[44px]"
        >
          A new chapter<br />starts here.
        </h1>
        <p className="mt-[19px] text-base leading-[1.45] text-muted-foreground">
          Discover a book. Follow your curiosity.<br />Make room for something new.
        </p>
        <div className="-mx-[6px] mt-8 flex justify-center overflow-hidden rounded-[18px] border border-[var(--glass-border)] bg-[var(--control)]/45">
          <img
            src="/images/login/reading.svg"
            alt="An open book above a stack of books beside a small plant"
            width="490"
            height="290"
            className="h-auto max-w-full"
          />
        </div>
        <p className="mt-10 text-left text-[10px] font-bold uppercase tracking-[0.04em] leading-[1.4] text-muted-foreground lg:mt-auto lg:pt-10 lg:pb-2">
          YOUR CAMPUS LIBRARY, A LITTLE CLOSER.
        </p>
      </section>
      <section
        aria-labelledby="login-heading"
        className="flex flex-col items-center justify-center px-2 pb-6 sm:px-6 lg:justify-start lg:pl-0 lg:pr-[72px] lg:pt-[121px]"
      >
        <div className="w-full max-w-[440px]">
          <h2 id="login-heading" className="text-[34px] font-bold leading-[1.3] tracking-tight text-heading">
            Welcome back
          </h2>
          <p className="mt-[6px] text-sm leading-[1.4] text-muted-foreground">
            Sign in to pick up where you left off.
          </p>
          {restored && (
            <p role="status" className="mt-4 rounded-xl border border-success/30 bg-success-soft p-3 text-sm text-success">
              Database restored. Sign in again to continue.
            </p>
          )}
          <div className="mt-[37px]">
            <LoginForm />
          </div>
          <div className="my-[27px] flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or continue with</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <GLogin layout="login" />
          <p className="mt-8 text-center text-[13px] text-muted-foreground">
            New to Pahina?{" "}
            <Link
              to="/register"
              className="ml-1 font-bold text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              Create an account
            </Link>
          </p>
        </div>
        <p className="mt-12 text-center text-[11px] text-muted-foreground lg:mt-[57px]">
          Pahina · Library Management System
        </p>
      </section>
    </div>
  </main>
  );
};

export default LoginPage;
