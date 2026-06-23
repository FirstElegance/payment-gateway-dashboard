import { Navigate } from 'react-router-dom';
import { getLoginPath, useAuth } from '../contexts/AuthContext';
import AppLoading from './AppLoading';

/**
 * Super Admin Protected Route
 * ป้องกัน routes ที่ต้อง login เป็น Super Admin
 */
const SuperAdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 transition-colors">
        <AppLoading size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={getLoginPath('superadmin')} replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default SuperAdminProtectedRoute;
