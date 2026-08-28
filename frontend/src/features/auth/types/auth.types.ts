export type UserRole = "student" | "librarian" | "admin";

export interface User {
  id: string;
  avatar_url: string;
  username: string;
  student_number?: string;
  email: string;
  password: string;
  course?: string;
  role: UserRole;
  google_id?: string;
  is_google_account?: boolean;
  is_active?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User
}

export interface LoginCredentials {
  email: string;
  password: string
}

export interface RegisterCredentials {
  email: string;
  username: string;
  student_number?: string;
  password: string;
  course?: string;
}

