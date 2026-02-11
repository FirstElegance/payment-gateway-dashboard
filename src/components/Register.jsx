import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Lock, User, AlertCircle, UserPlus, Mail, Shield } from 'lucide-react';

/**
 * Register Component
 * หน้าลงทะเบียนผู้ใช้ใหม่
 */
const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'Merchant', // Default: Merchant
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength (optional)
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const registerData = {
        username: formData.username,
        password: formData.password,
        role: formData.role,
        isActive: true,
      };

      const response = await authAPI.register(registerData);

      if (response.status === 'success') {
        // Registration successful - redirect to login
        alert('Registration successful! Please login.');
        navigate('/login');
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message 
        || err.message 
        || 'Registration failed. Please try again.';
      
      setError(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4 transition-colors">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 opacity-50 transition-colors"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.1),transparent_50%)]"></div>

      {/* Register Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Glassmorphism Card */}
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-8 transition-colors">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 p-3">
              <img 
                src="/ec-logo.png"
                alt="ELEGANCE Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">ELEGANCE</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-widest transition-colors">Payment System</p>
            <p className="text-sm text-slate-600 dark:text-slate-500 mt-2 transition-colors">Create your account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 rounded-lg flex items-start gap-2 transition-colors">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700 dark:text-red-400 transition-colors">{error}</span>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username/Email Field */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider transition-colors">
                Email / Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 transition-colors" />
                <input
                  id="username"
                  name="username"
                  type="email"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider transition-colors">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 transition-colors" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-600 mt-1 transition-colors">
                Minimum 6 characters
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider transition-colors">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 transition-colors" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Role Field */}
            <div>
              <label htmlFor="role" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider transition-colors">
                Account Type
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 transition-colors" />
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors appearance-none"
                  disabled={loading}
                >
                  <option value="Merchant">Merchant Account</option>
                  <option value="Admin">Administrator Account</option>
                </select>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-600 mt-1 transition-colors">
                Select your account type based on your role
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 transition-colors">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center transition-colors">
            <p className="text-xs text-slate-600 dark:text-slate-500 transition-colors">
              Protected by ELEGANCE Security
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-600 transition-colors">
            © 2025 ELEGANCE Payment System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
