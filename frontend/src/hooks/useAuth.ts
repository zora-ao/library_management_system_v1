import { AuthContext } from "@/context/AuthContext"
import { getAllUsers, updateUserRole} from "@/features/auth";
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