import { api } from "@/services/api";
import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from "../types/auth.types";

export const loginUser = async(credentials: LoginCredentials): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>("/auth/login", {
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password
  });

  return res.data;
};

export const registerUser = async(credentials: RegisterCredentials): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>("/auth/register", {
    ...credentials,
    email: credentials.email.trim().toLowerCase()
  });

  return res.data
};

export const getCurrentUser = async(): Promise<User> => {
  const res = await api.get<User>("/auth/me");

  return res.data;
}

export const getAllUsers = async(): Promise<User[]> => {
  const res = await api.get<User[]>("/users");

  return res.data;
}

export const updateUserRole = async({userId, role}: {userId: string, role: string}): Promise<User> => {
  const res = await api.put(`/users/${userId}/role`, {role});

  return res.data;
}
