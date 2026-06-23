import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, AlertCircle, LogIn, ShieldCheck } from 'lucide-react';

/**
 * Super Admin Login Component
 * หน้า Login สำหรับ Super Admin — theme เดียวกับ Login ปกติ
 */
const SuperAdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginSuperAdmin, isAuthenticated, isSuperAdmin, selectedPortal, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && isAuthenticated && isSuperAdmin) {
      navigate(selectedPortal ? '/' : '/superadmin/portal-banking', { replace: true });
    }
  }, [authLoading, isAuthenticated, isSuperAdmin, selectedPortal, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginSuperAdmin(username, password);

      if (result.success) {
        navigate('/superadmin/portal-banking', { replace: true });
      } else {
        setError(result.error || 'Login failed. Please check your super admin credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Super admin login error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 opacity-50 transition-colors"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.1),transparent_50%)]"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 transition-colors">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 p-3">
              <img
                src="/icon_bank/ec-logo.png"
                alt="ELEGANCE Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-500/20">
              <ShieldCheck className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Super Admin
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">ELEGANCE</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest transition-colors">
              Payment System
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-500 mt-2 transition-colors">
              Sign in to manage portal banking
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 rounded-lg flex items-center gap-2 transition-colors">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-700 dark:text-red-400 transition-colors">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="superadmin-username" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider transition-colors">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 transition-colors" />
                <input
                  id="superadmin-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter super admin username"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="superadmin-password" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider transition-colors">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 transition-colors" />
                <input
                  id="superadmin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter super admin password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              title="Sign in as super admin"
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Super Admin Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">
              Portal user?{' '}
              <Link
                to="/login"
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center transition-colors">
            <p className="text-xs text-slate-600 dark:text-slate-500 transition-colors">
              Protected by ELEGANCE Security
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-600 transition-colors">
            © 2025 ELEGANCE Payment System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
