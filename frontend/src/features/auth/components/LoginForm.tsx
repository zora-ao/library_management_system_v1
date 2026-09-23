import type React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Input } from "@base-ui/react/input";
import { Button } from "@base-ui/react/button";

import { type LoginFormValues, loginSchema } from "../types/auth.schema";
import { loginUser } from "../api/authApi";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const res = await loginUser(values);
      login(res.token, res.user);
      if (onSuccess) onSuccess();

      navigate("/books");
      toast.success("Welcome Back!");
    } catch (err: any) {
      setServerError(
        err.response?.data?.message || "Invalid credentials. Please try again."
      );
    }
  };

  return (
    <div className="w-full space-y-2.5">
      
      {serverError && (
        <div className="p-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
        
        <div className="space-y-1">
          <Label htmlFor="email" className="text-[10px] font-bold tracking-wider uppercase text-stone-600">
            EMAIL ADDRESS
          </Label>
          <div className="relative flex items-center">
            <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" />
            <Input
              id="email"
              type="email"
              placeholder="student@gmail.com"
              className="w-full pl-8 pr-3.5 py-1.5 h-9 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 text-stone-800 placeholder:text-stone-300 transition-colors shadow-none"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-[10px] text-red-500 font-medium">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className="text-[10px] font-bold tracking-wider uppercase text-stone-600">
            PASSWORD
          </Label>
          <div className="relative flex items-center">
            <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              className="w-full pl-8 pr-9 py-1.5 h-9 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 text-stone-800 placeholder:text-stone-300 transition-colors shadow-none"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 text-stone-400 hover:text-stone-700 transition-colors focus:outline-none cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-[10px] text-red-500 font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-9 bg-[#1a1515] hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70 mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Signin
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;