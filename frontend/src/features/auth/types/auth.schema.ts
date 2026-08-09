import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(8, "Password must be have 8 or more characters")
});

export type LoginFormValues = z.infer<typeof loginSchema>



