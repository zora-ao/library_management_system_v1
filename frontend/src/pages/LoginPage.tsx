import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import LoginForm from "@/features/auth/components/LoginForm";
import GLogin from "@/features/auth/components/GLogin";

const LoginPage = () => {
  return (
    <div className="h-screen w-full md:flex bg-stone-50/50">
      {/* Left Panel - Hero / Library Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-stone-900 overflow-hidden p-12 flex-col justify-end">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=1600&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-stone-950/40" />

        {/* Bottom Quote & Subtitle */}
        <div className="relative z-10 max-w-lg space-y-3">
          <p className="text-2xl lg:text-3xl font-serif italic text-stone-100 leading-snug">
            "A sanctuary for curious minds, where centuries of dialogue await your inquiry."
          </p>
          <p className="text-xs font-semibold tracking-widest text-stone-400 uppercase">
            Main Reading Hall • Established 1884
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Form Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          
          {/* Header & Logo */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-bold text-lg shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-stone-900">
                LIBERA
              </span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              Welcome back. Access your digital card, catalog reservations, and scholarly databases.
            </p>
          </div>

          {/* Embedded Login Form Component */}
          <LoginForm />

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-stone-200 w-full" />
            <span className="bg-stone-50/50 px-3 text-[10px] font-semibold text-stone-400 tracking-wider uppercase absolute">
              Or sign in with
            </span>
          </div>

          {/* Google OAuth Login */}
          <GLogin />

          {/* Footer Link */}
          <p className="text-center text-xs text-stone-500 pt-2">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-stone-900 underline underline-offset-4 hover:text-stone-700 transition-colors">
              Create account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;