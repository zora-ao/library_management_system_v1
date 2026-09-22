import LoginForm from "@/features/auth/components/LoginForm";
import GLogin from "@/features/auth/components/GLogin";
import { Link } from "react-router-dom";

const LoginPage = () => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-stone-900 overflow-y-auto">
      
      <div
        className="fixed inset-0 bg-cover bg-center opacity-85"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=1600&auto=format&fit=crop')`,
        }}
      />
      <div className="fixed inset-0 bg-stone-950/20 backdrop-blur-[2px]" />

    
      <div className="relative z-10 w-full max-w-[440px] bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 my-auto">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center">

          <h1 className="text-lg font-bold text-stone-900">
            Welcome Back
          </h1>
          <p className="text-[11px] text-stone-500 max-w-xs leading-normal">
            Please enter your details
          </p>
        </div>

  
        <LoginForm />

        {/* Divider */}
        <div className="relative flex items-center justify-center my-3">
          <div className="border-t border-stone-200 w-full" />
          <span className="bg-white px-3 text-[9px] font-semibold text-stone-400 tracking-wider uppercase absolute">
            OR CONTINUE WITH
          </span>
        </div>

  
        <GLogin />

        {/* Footer Link */}
        <p className="text-center text-[11px] text-stone-500 pt-1">
          Don't have account yet?
          <Link
            to="/register"
            className="pl-1 font-semibold text-stone-900 underline underline-offset-4 hover:text-stone-700 transition-colors"
          >
            Register Account
          </Link>
        </p>

      </div>
    </div>
  );
};

export default LoginPage;