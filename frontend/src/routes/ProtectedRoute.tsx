import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";


export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading){
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated){
    return <Navigate to="/login" replace />
  }

  return <Outlet />;
};