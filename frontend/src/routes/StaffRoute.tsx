import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function StaffRoute() {
  const { user } = useAuth();
  return user?.role === "admin" || user?.role === "librarian"
    ? <Outlet />
    : <Navigate to="/books" replace />;
}
