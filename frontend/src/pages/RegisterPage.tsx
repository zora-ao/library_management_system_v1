import RegisterForm from "@/features/auth/components/RegisterForm";
import GLogin from "@/features/auth/components/GLogin";
import { Link } from "react-router-dom";

const RegisterPage = () => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-foreground overflow-y-auto">
      <div
        className="fixed inset-0 bg-cover bg-center opacity-85"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=1600&auto=format&fit=crop')`,
        }}
      />
      <div className="fixed inset-0 bg-foreground/20 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-[440px] bg-card rounded-xl p-6 sm:p-8 shadow-xl space-y-4 my-auto">

        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Register Account
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Please enter your details
          </p>
        </div>

        <RegisterForm />

        <div className="relative flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-card px-3 text-xs font-medium text-muted-foreground tracking-wider uppercase absolute">
            Or continue with
          </span>
        </div>

        <GLogin />

        <p className="text-center text-sm text-muted-foreground">
          Already have a account?
          <Link
            to="/login"
            className="pl-1 font-semibold text-foreground underline underline-offset-4 hover:text-primary transition-colors"
          >
            Log in to your Account
          </Link>
        </p>

      </div>
    </div>
  );
};

export default RegisterPage;
