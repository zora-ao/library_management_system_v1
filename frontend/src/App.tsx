import { Navigate, Route, Routes } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import { ProtectedRoute } from "./routes/ProtectedRoute"
import RegisterPage from "./pages/RegisterPage"
import MainLayout from "./components/ui/layout/MainLayout"
import { useAuth } from "./hooks/useAuth"
import BooksListPage from "./pages/BooksListPage"
import BookCatalogPage from "./pages/BookCatalogPage"


const App = () => {
  const { user } = useAuth();

  return (
    <Routes>

      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        {/* Routes with authentication */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          <Route path="/books" element={<BookCatalogPage/>} />
          <Route path="/borrows" element={<div>My Borrows</div>} />
          {user?.role == "admin" && (
            <>
              <Route path="/users" element={<div>Users Lists</div>} />
              <Route path="/book-list" element={<BooksListPage />} />
            </>
          )}
        </Route>
      </Route>

      {/* Default Route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
      
    </Routes>
  )
}

export default App
