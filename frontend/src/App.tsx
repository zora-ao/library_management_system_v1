import { Navigate, Route, Routes } from "react-router-dom"
import LoginPage from "./pages/LoginPage"
import { ProtectedRoute } from "./routes/ProtectedRoute"
import RegisterPage from "./pages/RegisterPage"
import MainLayout from "./components/layout/MainLayout"
import { useAuth } from "./hooks/useAuth"
import BooksListPage from "./pages/adminPage/BooksListPage"
import BookCatalogPage from "./pages/usersPage/BookCatalogPage"
import MyBorrowsPage from "./pages/usersPage/MyBorrowsPage"
import AdminBorrowsPage from "./pages/adminPage/AdminBorrowsPage"
import AdminUsersPage from "./pages/adminPage/AdminUsersPage"
import BookDetailsPage from "./pages/usersPage/BookDetailsPage"
import UsersProfile from "./pages/usersPage/UsersProfile"


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
          <Route path="/books/:id" element={<BookDetailsPage />} />
          <Route path="/my-borrows" element={<MyBorrowsPage />} />
          <Route path="/profile" element={<UsersProfile />} />
          {user?.role == "admin" && (
            <>
              <Route path="/users" element={<AdminUsersPage />} />
              <Route path="/all-borrows" element={<AdminBorrowsPage />} />
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
