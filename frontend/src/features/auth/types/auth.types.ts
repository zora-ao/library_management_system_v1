export type UserRole = "student" | "librarian" | "admin";

export interface BaseUser {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  phone?: string;
  status?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  student_number: string | null;
  course: string | null;
  year_level: string | null;
  enrollment_status: string;
}

export interface Student extends BaseUser {
  role: "student";
  student: StudentProfile | null;
}

export interface Librarian extends BaseUser {
  role: "librarian";
}

export interface Admin extends BaseUser {
  role: "admin";
}

export type User = Student | Librarian | Admin;

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
}