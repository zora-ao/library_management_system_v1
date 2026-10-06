import { AuthContext } from "@/context/auth-context"
import { getAllUsers, updateUserActiveStatus, updateUserProfile, updateUserRole} from "@/features/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react"
import { AxiosError } from "axios";
import { toast } from "sonner";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be within an AuthProvider");
  }

  return context;
};


export const useGetAllUsers = () => {

  return useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User role updated successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update user role");
    }
  })
}

export const useUpdateUserActiveStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserActiveStatus,
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        user.is_active
          ? `${user.username} has been activated`
          : `${user.username} has been deactivated`
      );
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update account status");
    }
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (data) => {
      if (data?.user) {
        updateUser(data.user);
      }

      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update profile");
    },
  });
};