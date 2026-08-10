export type UserRole = "student" | "librarian" | "admin";

export interface User {
  id: string;
  username: string;
  student_number?: string;
  email: string;
  password: string;
  course?: string;
  role: UserRole;
}

export interface AuthResponse {
  access_token: string;
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

