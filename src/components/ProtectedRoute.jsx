import { Navigate } from 'react-router-dom';
import { getLoginPath, useAuth } from '../contexts/AuthContext';
import AppLoading from './AppLoading';

/**
 * Protected Route Component
 * ป้องกัน routes ที่ต้อง login
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isSuperAdmin, selectedPortal, loading, portalValidating } = useAuth();

  if (loading || portalValidating) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors">
        <AppLoading size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginType = localStorage.getItem('elegance_login_type');
    return <Navigate to={getLoginPath(loginType)} replace />;
  }

  if (isSuperAdmin && !selectedPortal) {
    return <Navigate to="/superadmin/portal-banking" replace />;
  }

  return children;
};

export default ProtectedRoute;




