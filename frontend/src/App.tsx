import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import RegisterPage from "./pages/RegisterPage";
import MainLayout from "./components/layout/MainLayout";
import { useAuth } from "./hooks/useAuth";
import { PageErrorBoundary, PageFallback } from "./components/layout/PageOutlet";
import { AdminRoute } from "./routes/AdminRoute";
import { StaffRoute } from "./routes/StaffRoute";

const BooksListPage = lazy(() => import("./pages/adminPage/BooksListPage"));
const BookCatalogPage = lazy(() => import("./pages/usersPage/BookCatalogPage"));
const MyBorrowsPage = lazy(() => import("./pages/usersPage/MyBorrowsPage"));
const MyFavoritesPage = lazy(() => import("./pages/usersPage/MyFavoritesPage"));
const AdminBorrowsPage = lazy(() => import("./pages/adminPage/AdminBorrowsPage"));
const AdminUsersPage = lazy(() => import("./pages/adminPage/AdminUsersPage"));
const AdminDashboardPage = lazy(() => import("./pages/adminPage/AdminDashboardPage"));
const BookDetailsPage = lazy(() => import("./pages/usersPage/BookDetailsPage"));
const UsersProfile = lazy(() => import("./pages/usersPage/UsersProfile"));
const About = lazy(() => import("./pages/About"));
const BorrowRequestsPage = lazy(() => import("./pages/adminPage/BorrowRequestsPage"));
const CategoriesPage = lazy(() => import("./pages/adminPage/CategoriesPage"));
const DataBackupsPage = lazy(() => import("./pages/adminPage/DataBackupsPage"));

const App = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  return (
    <PageErrorBoundary resetKey={pathname}>
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    </PageErrorBoundary>
  );
};

export default App;
