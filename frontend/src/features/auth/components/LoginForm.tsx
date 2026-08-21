import { useAuth } from "@/hooks/useAuth";
import type React from "react";
import { useState } from "react";

import { useForm } from "react-hook-form";
import { loginSchema, type LoginFormValues } from "../types/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@base-ui/react/input";
import { Button } from "@base-ui/react/button";
import { loginUser } from "../api/authApi";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async(values: LoginFormValues) => {
    setServerError(null);
    try {
      const res = await loginUser(values);
      console.log(res)
      login(res.token, res.user);
      if (onSuccess) onSuccess();

      navigate("/dashboard");

      toast.success("Welcome Back!");
    } catch (err: any) {
      setServerError(
        err.response?.data?.message || "Invalid credentials. Please try again."
      )
    }
  }

  return (
    <Card className="w-full h-full ">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>Enter your email below to login to your account!</CardDescription>
        <CardAction>
          Sign Up
        </CardAction>
      </CardHeader>
      <CardContent>
        {serverError && (
          <div className="mb-4 p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md">
            {serverError}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email:</Label>
            <Input
              id="email"
              type="email"
              placeholder="student@gmail.com"
              className="border p-2 rounded w-full"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password:</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter you password"
              className="border p-2 rounded w-full"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button 
            type="submit"
            disabled={isSubmitting}
            className="bg-accent-foreground text-white w-full p-2 rounded cursor-pointer">
            {isSubmitting ? (
              <> 
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default LoginForm
