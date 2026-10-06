import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api"
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

const GLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async(credentials: CredentialResponse) => {
    try {

      if (!credentials.credential) {
        console.error("No credential received from Google");
        return;
      }

      const { data } = await api.post("/auth/google", {
        token: credentials.credential,
      });

      login(data.access_token, data.user);

      if (data.user?.role === "admin" || data.user?.role === "librarian") {
        navigate("/dashboard");
      } else {
        navigate("/books");
      }

      return data;
    } catch (error) {
      console.error("Failed to login", error);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 rounded-sm">
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => console.error("Google Login Failed")}
      />
    </div>
  )
}

export default GLogin
