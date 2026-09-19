import { useAuth } from "@/hooks/useAuth";
import type React from "react";
import { useState } from "react";

import { useForm } from "react-hook-form";
import { loginSchema, type LoginFormValues } from "../types/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@/components/ui/label";
import { Input } from "@base-ui/react/input";
import { Button } from "@base-ui/react/button";
import { loginUser } from "../api/authApi";

import { Loader2, ArrowRight, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [serverError, setServerError] = useState<string | null>(null);
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

      navigate("/dashboard");
      toast.success("Welcome Back!");
    } catch (err: any) {
      setServerError(
        err.response?.data?.message || "Invalid credentials. Please try again."
      );
    }
  };

  return (
    <div className="w-full space-y-4">
      {serverError && (
        <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[11px] font-bold tracking-wider uppercase text-stone-600">
            Email Address
          </Label>
          <div className="relative flex items-center">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <Input
              id="email"
              type="email"
              placeholder="student@gmail.com"
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50/50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-red-500 font-medium">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[11px] font-bold tracking-wider uppercase text-stone-600">
            Password
          </Label>
          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••••••"
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50/50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
              {...register("password")}
            />
          </div>
          {errors.password && (
            <p className="text-[11px] text-red-500 font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember / Forgot Row */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 text-stone-500 cursor-pointer">
            <input type="checkbox" className="rounded border-stone-300 text-stone-900 focus:ring-0" />
            <span>Remember session</span>
          </label>
          <Link to="/forgot-password" className="text-stone-500 hover:text-stone-900 font-medium transition-colors">
            Forgot Password?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In to Library <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default LoginForm;