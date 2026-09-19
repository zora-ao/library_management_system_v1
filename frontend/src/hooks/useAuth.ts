import { AuthContext } from "@/context/AuthContext"
import { getAllUsers, updateUserProfile, updateUserRole} from "@/features/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react"

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
    }
  })
}

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (data) => {
      console.log("Updated profile response:", data);

      if (data?.user) {
        updateUser(data.user);
      }

      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};