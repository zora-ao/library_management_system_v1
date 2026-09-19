import RegisterForm from "@/features/auth/components/RegisterForm";
import GLogin from "@/features/auth/components/GLogin";
import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const RegisterPage = () => {
  return (
    <div className="h-screen w-full md:flex bg-stone-50/50">
      {/* Left Panel - Hero / Library Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-stone-900 overflow-hidden p-12 flex-col justify-between">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=1600&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-stone-950/40" />

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
              <div>
                <span className="font-serif text-2xl font-bold tracking-tight text-stone-900 block leading-none">
                  LIBERA
                </span>
                <span className="text-[10px] font-semibold tracking-widest text-stone-400 uppercase">
                  ARCHIVAL NETWORK
                </span>
              </div>
            </div>

            <h1 className="text-xl font-semibold text-stone-900 pt-2">
              Register for a Library Card
            </h1>
            <p className="text-xs text-stone-500 leading-relaxed">
              Join the library network to borrow books, stream journals, and reserve quiet study suites.
            </p>
          </div>

          {/* Embedded Form */}
          <RegisterForm />

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-stone-200 w-full" />
            <span className="bg-stone-50/50 px-3 text-[10px] font-semibold text-stone-400 tracking-wider uppercase absolute">
              OR CONTINUE WITH
            </span>
          </div>

          {/* Google OAuth Login */}
          <GLogin />

          {/* Footer Link */}
          <p className="text-center text-xs text-stone-500 pt-2">
            Already have a card?{" "}
            <Link to="/login" className="font-semibold text-stone-900 underline underline-offset-4 hover:text-stone-700 transition-colors">
              Log in to your Account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
};

export default RegisterPage;