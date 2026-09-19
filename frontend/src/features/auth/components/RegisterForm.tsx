import type React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { type RegisterFormValues, registerSchema } from "../types/auth.schema";
import { registerUser } from "../api/authApi";
import { toast } from "sonner";

interface RegisterFormProps {
  onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser(values);
      if (onSuccess) onSuccess();

      navigate("/login");
      toast.success("Account created successfully!");
    } catch (err: any) {
      setServerError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Server Error Alert */}
      {serverError && (
        <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email & Username Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[10px] font-bold tracking-wider uppercase text-stone-600">
              EMAIL ADDRESS
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="student@gmail.com"
              className="w-full px-3 py-2 text-xs bg-stone-50/50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-[11px] text-red-500 font-medium">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-[10px] font-bold tracking-wider uppercase text-stone-600">
              USERNAME
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Choose a username"
              className="w-full px-3 py-2 text-xs bg-stone-50/50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
              {...register("username")}
            />
            {errors.username && (
              <p className="text-[11px] text-red-500 font-medium">
                {errors.username.message}
              </p>
            )}
          </div>
        </div>

        {/* Password & Confirm Password Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[10px] font-bold tracking-wider uppercase text-stone-600">
              PASSWORD
            </Label>
            <div className="relative flex items-center">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                className="w-full pl-3 pr-8 py-2 text-xs bg-stone-50/50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-500 font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-[10px] font-bold tracking-wider uppercase text-stone-600">
              CONFIRM PASSWORD
            </Label>
            <div className="relative flex items-center">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••••••"
                className="w-full pl-3 pr-8 py-2 text-xs bg-stone-50/50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 focus:bg-white transition-colors"
                {...register("confirmPassword" as keyof RegisterFormValues)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] text-red-500 font-medium">
                {errors.confirmPassword.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70 mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            <>
              Create Account <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default RegisterForm;