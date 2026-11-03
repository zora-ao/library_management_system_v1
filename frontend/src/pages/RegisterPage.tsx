import RegisterForm from "@/features/auth/components/RegisterForm";
import GLogin from "@/features/auth/components/GLogin";
import { Link } from "react-router-dom";

const RegisterPage = () => (
  <main className="min-h-svh bg-background p-4 text-foreground sm:p-6">
    <div className="mx-auto grid min-h-[calc(100svh-3rem)] max-w-[1232px] gap-10 lg:grid-cols-[552fr_632fr] lg:gap-12">
      <section
        aria-labelledby="register-welcome"
        className="flex flex-col rounded-[24px] border border-[var(--glass-border)] bg-card/65 px-6 py-8 shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)] sm:px-[39px] lg:min-h-[752px]"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[11px] bg-[#f3cd63] text-primary-foreground shadow-2xs dark:bg-primary">
            <img src="/pahina-logo.svg" alt="" width="40" height="40" />
          </span>
          <span className="text-[25px] font-bold leading-[1.4] tracking-tight text-foreground">Pahina</span>
        </div>
        <h1
          id="register-welcome"
          className="mt-10 text-[36px] font-bold leading-[1.22] tracking-tight text-foreground sm:mt-[61px] sm:text-[44px]"
        >
          Your next read<br />is waiting.
        </h1>
        <p className="mt-[19px] text-base leading-[1.45] text-muted-foreground">
          Join your campus library.<br />Discover, borrow, and save your favorites.
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
        aria-labelledby="register-heading"
        className="flex flex-col items-center justify-center px-2 pb-6 sm:px-6 lg:justify-start lg:pl-0 lg:pr-[72px] lg:pt-[42px]"
      >
        <div className="w-full max-w-[440px]">
          <h2 id="register-heading" className="text-[32px] font-bold leading-[1.3] tracking-tight text-heading">
            Create your account
          </h2>
          <p className="mt-[6px] text-sm leading-[1.4] text-muted-foreground">
            Your campus library, ready when you are.
          </p>
          <div className="mt-[28px]">
            <RegisterForm />
          </div>
          <div className="my-[23px] flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or continue with</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <GLogin layout="login" />
          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="ml-1 font-bold text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              Sign in
            </Link>
          </p>
        </div>
        <p className="mt-12 text-center text-[11px] text-muted-foreground lg:mt-[38px]">
          Pahina · Library Management System
        </p>
      </section>
    </div>
  </main>
);

export default RegisterPage;
