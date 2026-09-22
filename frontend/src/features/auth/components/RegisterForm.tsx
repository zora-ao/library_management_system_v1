import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { type RegisterFormValues, registerSchema } from "../types/auth.schema";
import { registerUser } from "../api/authApi";
import { toast } from "sonner";

interface RegisterFormProps {
  onSuccess?: () => void;
}

const RegisterForm = ({ onSuccess }: RegisterFormProps) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
          <Input
            id="email"
            type="email"
            placeholder="student@gmail.com"
            className="w-full px-3.5 py-1.5 h-9 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 text-stone-800 placeholder:text-stone-300 transition-colors shadow-none"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-[10px] text-red-500 font-medium">
              {errors.email.message}
            </p>
          )}
        </div>

      
        <div className="space-y-1">
          <Label htmlFor="username" className="text-[10px] font-bold tracking-wider uppercase text-stone-600">
            USERNAME
          </Label>
          <Input
            id="username"
            type="text"
            placeholder="Choose a username"
            className="w-full px-3.5 py-1.5 h-9 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 text-stone-800 placeholder:text-stone-300 transition-colors shadow-none"
            {...register("username")}
          />
          {errors.username && (
            <p className="text-[10px] text-red-500 font-medium">
              {errors.username.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
        
          <div className="space-y-1">
            <Label htmlFor="password" className="text-[10px] font-bold tracking-wider uppercase text-stone-600">
              PASSWORD
            </Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-1.5 h-9 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 text-stone-800 placeholder:text-stone-300 transition-colors shadow-none"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-[10px] text-red-500 font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

        
          <div className="space-y-1">
            <Label htmlFor="confirmPassword" className="text-[10px] font-bold tracking-wider uppercase text-stone-600">
              CONFIRM PASSWORD
            </Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-1.5 h-9 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400 text-stone-800 placeholder:text-stone-300 transition-colors shadow-none"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-[10px] text-red-500 font-medium">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-0.5 pb-1">
          <input
            id="showPassword"
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-stone-300 text-stone-900 focus:ring-0 accent-stone-900 cursor-pointer"
          />
          <label htmlFor="showPassword" className="text-[11px] text-stone-600 cursor-pointer select-none">
            Show password
          </label>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-9 bg-[#1a1515] hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70 mt-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
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