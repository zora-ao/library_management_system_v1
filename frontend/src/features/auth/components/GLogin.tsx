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

      navigate("/dashboard")

      console.log(data)
    
      return data;
    } catch (error) {
      console.error("Failed to login");
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-xl font-semibold">Sign In</h2>
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={() => console.log("Google Login Failed")}
      />
    </div>
  )
}

export default GLogin
