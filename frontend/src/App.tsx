import { Navigate, Route, Routes } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import { ProtectedRoute } from "./routes/ProtectedRoute"
import HomePage from "./pages/HomePage"
import RegisterPage from "./pages/RegisterPage"


const App = () => {
  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        {/* Routes with authentication */}
        <Route path="/home" element={<HomePage />} />
      </Route>

      {/* Default Route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
      
    </Routes>
  )
}

export default App
