import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { type RegisterFormValues, registerSchema } from "../types/auth.schema";
import { registerUser } from "../api/authApi";
import { isAxiosError } from "axios";
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
    } catch (err) {
      setServerError(
        (isAxiosError(err) && err.response?.data?.message) ||
          "Registration failed. Please try again."
      );
    }
  };

  const inputClasses =
    "w-full h-10 px-3 py-2 text-base md:text-base bg-card border border-input rounded-lg text-foreground";

  return (
    <div className="w-full space-y-3">

      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 px-3 py-2.5 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-medium leading-normal text-foreground">
            Email address
          </Label>
          <div className="space-y-1">
            <Input
              id="email"
              type="email"
              placeholder="student@gmail.com"
              className={inputClasses}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs font-medium leading-normal text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username" className="text-xs font-medium leading-normal text-foreground">
            Username
          </Label>
          <div className="space-y-1">
            <Input
              id="username"
              type="text"
              placeholder="Choose a username"
              className={inputClasses}
              {...register("username")}
            />
            {errors.username && (
              <p className="text-xs font-medium leading-normal text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-medium leading-normal text-foreground">
            Password
          </Label>
          <div className="space-y-1">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                className={`${inputClasses} pr-10`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs font-medium leading-normal text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-xs font-medium leading-normal text-foreground">
            Confirm password
          </Label>
          <div className="space-y-1">
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                className={`${inputClasses} pr-10`}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs font-medium leading-normal text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70 shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            <>
              Create Account <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default RegisterForm;
