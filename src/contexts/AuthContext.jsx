import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, portalBankingAPI, SELECTED_PORTAL_KEY, normalizeBearerToken, stripAuthScheme, hasSuperAdminRole } from '../services/api';

/**
 * Auth Context
 * จัดการ authentication state และ functions
 */
const AuthContext = createContext(null);

const LOGIN_TYPE_KEY = 'elegance_login_type';
export const SUPER_ADMIN_ROLE = 'Super-Admin';

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;

  const rawToken = stripAuthScheme(token);
  const parts = rawToken.split('.');

  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

const getRolesFromLoginResponse = (response) => {
  const directRoles = response.data?.roles || response.data?.role;
  if (directRoles) return directRoles;

  const payload = decodeJwtPayload(response.data?.token);
  return payload?.roles || payload?.role || null;
};

const normalizeSelectedPortal = (portal) => ({
  id: portal.id,
  merchant: portal.merchant,
  vitePaymentUrl: portal.vitePaymentUrl,
  vitePaymentToken: portal.vitePaymentToken,
  environment: portal.environment,
  isActive: portal.isActive,
});

export const getLoginPath = (loginType) =>
  loginType === 'superadmin' ? '/superadmin/login' : '/login';

export const isSuperAdminUser = (user) =>
  hasSuperAdminRole(user?.roles) && user?.loginType === 'superadmin';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [selectedPortal, setSelectedPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalValidating, setPortalValidating] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('elegance_user');
    const storedToken = localStorage.getItem('elegance_token');
    const storedPortal = localStorage.getItem(SELECTED_PORTAL_KEY);
    const loginType = localStorage.getItem(LOGIN_TYPE_KEY);

    if (loginType === 'superadmin' && storedPortal) {
      try {
        const portalData = JSON.parse(storedPortal);
        setSelectedPortal(portalData);
      } catch (err) {
        console.error('Error parsing selected portal:', err);
        localStorage.removeItem(SELECTED_PORTAL_KEY);
      }
    } else if (loginType !== 'superadmin' && storedPortal) {
      localStorage.removeItem(SELECTED_PORTAL_KEY);
    }

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Error parsing stored user:', err);
        localStorage.removeItem('elegance_user');
        localStorage.removeItem('elegance_token');
        localStorage.removeItem(LOGIN_TYPE_KEY);
        localStorage.removeItem(SELECTED_PORTAL_KEY);
      }
    }
    setLoading(false);
  }, []);

  // ถ้า merchant ถูกลบจาก backend แล้ว → ล้าง cache และบังคับเลือกใหม่
  useEffect(() => {
    if (loading || !isSuperAdminUser(user) || !selectedPortal) {
      setPortalValidating(false);
      return undefined;
    }

    let cancelled = false;
    setPortalValidating(true);

    const validateSelectedPortal = async () => {
      try {
        const data = await portalBankingAPI.getAll();
        const list = Array.isArray(data) ? data : [];
        const matched = list.find(
          (portal) => String(portal.id) === String(selectedPortal.id),
        );

        if (list.length > 0 && (!matched || matched.isActive === false) && !cancelled) {
          clearSelectedPortal();
        } else if (matched && !cancelled) {
          const updated = normalizeSelectedPortal(matched);
          setSelectedPortal(updated);
          localStorage.setItem(SELECTED_PORTAL_KEY, JSON.stringify(updated));
        }
      } catch (err) {
        console.error('Error validating selected portal:', err);
      } finally {
        if (!cancelled) {
          setPortalValidating(false);
        }
      }
    };

    validateSelectedPortal();

    return () => {
      cancelled = true;
    };
  }, [loading, user, selectedPortal?.id]);

  const clearSelectedPortal = () => {
    setSelectedPortal(null);
    localStorage.removeItem(SELECTED_PORTAL_KEY);
  };

  const persistLogin = (response, username, loginType) => {
    if (response.status !== 'success') {
      return {
        success: false,
        error: response.message || 'Login failed',
      };
    }

    const token = response.data?.token;

    if (!token) {
      return {
        success: false,
        error: 'No token received from server',
      };
    }

    const normalizedToken = normalizeBearerToken(token);
    const roles = getRolesFromLoginResponse(response);
    const userData = {
      username: response.data?.username || username,
      name: response.data?.username || username,
      roles,
      role: roles,
      loginType,
      token: normalizedToken,
    };

    setUser(userData);
    localStorage.setItem('elegance_user', JSON.stringify(userData));
    localStorage.setItem('elegance_token', normalizedToken);
    localStorage.setItem(LOGIN_TYPE_KEY, loginType);

    // login ใหม่ → ล้าง merchant ที่เลือกไว้ก่อนหน้า
    clearSelectedPortal();

    return { success: true };
  };

  const handleLoginError = (error, fallbackMessage) => {
    console.error('Login error:', error);

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      fallbackMessage;

    return {
      success: false,
      error: errorMessage,
    };
  };

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);
      return persistLogin(response, username, 'portal');
    } catch (error) {
      return handleLoginError(error, 'Login failed. Please check your credentials.');
    }
  };

  const loginSuperAdmin = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);

      if (response.status !== 'success') {
        return {
          success: false,
          error: response.message || 'Login failed',
        };
      }

      const roles = getRolesFromLoginResponse(response);
      if (!hasSuperAdminRole(roles)) {
        return {
          success: false,
          error: 'Access denied. Super-Admin role required.',
        };
      }

      return persistLogin(response, username, 'superadmin');
    } catch (error) {
      return handleLoginError(error, 'Super admin login failed. Please check your credentials.');
    }
  };

  const selectPortal = (portal) => {
    const portalData = normalizeSelectedPortal(portal);
    setSelectedPortal(portalData);
    localStorage.setItem(SELECTED_PORTAL_KEY, JSON.stringify(portalData));
  };

  const exitPortal = () => {
    clearSelectedPortal();
  };

  const logout = () => {
    const loginPath = getLoginPath(localStorage.getItem(LOGIN_TYPE_KEY));

    setUser(null);
    setSelectedPortal(null);
    localStorage.removeItem('elegance_user');
    localStorage.removeItem('elegance_token');
    localStorage.removeItem(LOGIN_TYPE_KEY);
    localStorage.removeItem(SELECTED_PORTAL_KEY);

    return loginPath;
  };

  const value = {
    user,
    selectedPortal: isSuperAdminUser(user) ? selectedPortal : null,
    login,
    loginSuperAdmin,
    selectPortal,
    exitPortal,
    logout,
    loading,
    portalValidating,
    isAuthenticated: !!user,
    isSuperAdmin: isSuperAdminUser(user),
    isPortalSelected: isSuperAdminUser(user) && !!selectedPortal,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
