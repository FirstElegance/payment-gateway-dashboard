import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLoading from './AppLoading';

/**
 * Protected Route Component
 * ป้องกัน routes ที่ต้อง login
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors">
        <AppLoading size="lg" text="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;




