import type { User } from "@/features/auth/types/auth.types";
import { createContext } from "react";
import type { Dispatch, SetStateAction } from "react";

export interface AuthContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  updateUser: (user: User) => void;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);
