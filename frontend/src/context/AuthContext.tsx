import type { User } from "@/features/auth/types/auth.types";
import React, { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "./auth-context";

interface AuthProviderProps {
  children: ReactNode
}

const readSession = (): { token: string | null; user: User | null } => {
  const storedToken = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  if (!storedToken || !storedUser) {
    return { token: null, user: null };
  }

  try {
    return { token: storedToken, user: JSON.parse(storedUser) as User };
  } catch (error) {
    console.error("Failed to get session: ", error);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { token: null, user: null };
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => readSession().user);
  const [token, setToken] = useState<string | null>(() => readSession().token);
  const queryClient = useQueryClient();

  const isLoading = false;

  const updateUser = (updatedUser: User) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        updateUser,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout
      }}
    >
      { children }
    </AuthContext.Provider>
  )

}
