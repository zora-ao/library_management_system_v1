import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import RegisterPage from "./pages/RegisterPage";
import MainLayout from "./components/layout/MainLayout";
import { useAuth } from "./hooks/useAuth";
import BooksListPage from "./pages/adminPage/BooksListPage";
import BookCatalogPage from "./pages/usersPage/BookCatalogPage";
import MyBorrowsPage from "./pages/usersPage/MyBorrowsPage";
import MyFavoritesPage from "./pages/usersPage/MyFavoritesPage";
import AdminBorrowsPage from "./pages/adminPage/AdminBorrowsPage";
import AdminUsersPage from "./pages/adminPage/AdminUsersPage";
import AdminDashboardPage from "./pages/adminPage/AdminDashboardPage";
import BookDetailsPage from "./pages/usersPage/BookDetailsPage";
import UsersProfile from "./pages/usersPage/UsersProfile";
import About from "./pages/About";
import BorrowRequestsPage from "./pages/adminPage/BorrowRequestsPage";
import CategoriesPage from "./pages/adminPage/CategoriesPage";
import DataBackupsPage from "./pages/adminPage/DataBackupsPage";
import { AdminRoute } from "./routes/AdminRoute";
import { StaffRoute } from "./routes/StaffRoute";
import DsaExplorerPage from "./pages/adminPage/DsaExplorerPage";

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
          <Route path="/about" element={<About />} />
          <Route path="/books" element={<BookCatalogPage />} />
          <Route path="/books/:id" element={<BookDetailsPage />} />
          <Route path="/my-borrows" element={<MyBorrowsPage />} />
          <Route path="/my-favorites" element={<MyFavoritesPage />} />
          <Route path="/profile" element={<UsersProfile />} />
          <Route element={<StaffRoute />}>
            <Route path="/dsa-explorer" element={<DsaExplorerPage />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/backups" element={<DataBackupsPage />} />
          </Route>
          {(user?.role === "admin" || user?.role === "librarian") && (
            <>
              <Route path="/dashboard" element={<AdminDashboardPage />} />
              <Route path="/users" element={<AdminUsersPage />} />
              <Route path="/users/:role" element={<AdminUsersPage />} />
              <Route path="/all-borrows" element={<AdminBorrowsPage />} />
              <Route path="/all-borrows/:status" element={<AdminBorrowsPage />} />
              <Route
                path="/borrow-requests"
                element={<Navigate to="/borrow-requests/pending" replace />}
              />
              <Route path="/borrow-requests/:tab" element={<BorrowRequestsPage />} />
              <Route path="/book-list" element={<BooksListPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
            </>
          )}
        </Route>
      </Route>

      {/* Default Route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
