import { api } from "@/services/api";
import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from "../types/auth.types";


export interface UpdateProfilePayload {
  username?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  student?: {
    student_number?: string;
    course?: string;
    year_level?: string;
    avatar?: File;
  };
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export const updateUserProfile = async (formData: FormData) => {
  const { data } = await api.put("/users/me", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const changePassword = async (payload: ChangePasswordPayload) => {
  const { data } = await api.put<{ message: string }>("/users/me/password", payload);
  return data;
};

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

export const getAllUsers = async(): Promise<User[]> => {
  const res = await api.get<User[]>("/users");

  return res.data;
}

export const updateUserRole = async({userId, role}: {userId: string, role: string}): Promise<User> => {
  const res = await api.put(`/users/${userId}/role`, {role});

  return res.data;
}

export const updateUserActiveStatus = async({userId, isActive}: {userId: string, isActive: boolean}): Promise<User> => {
  const res = await api.put(`/users/${userId}/active`, {is_active: isActive});

  return res.data;
}

