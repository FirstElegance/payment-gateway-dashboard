import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Settings,
  Home,
  LogOut,
  FileText,
  Wallet,
  ArrowLeftRight,
  Sun,
  Moon,
  QrCode,
  Users,
  Menu,
  X,
  RefreshCw,
  ChevronDown,
  CreditCard,
  ArrowLeft,
  Building2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFeatures } from '../contexts/FeatureContext';
import { useAutoRefresh } from '../contexts/AutoRefreshContext';
import { bankConfigAPI, transferConfigAPI } from '../services/api';

/**
 * Layout Component with Navbar
 * Layout หลักที่มี Navbar สำหรับเลือกเมนู
 */
const Layout = ({ children, superAdminShell = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, selectedPortal, isSuperAdmin, exitPortal } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { features } = useFeatures();
  const { intervalSeconds, setIntervalSeconds, isActive: isAutoRefreshActive } = useAutoRefresh();
  const [autoRefreshDropdownOpen, setAutoRefreshDropdownOpen] = useState(false);
  const [profileName, setProfileName] = useState('profileName');
  const [businessConfig, setBusinessConfig] = useState(null);
  const [activeBanks, setActiveBanks] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [allConfigs, setAllConfigs] = useState([]);

  useEffect(() => {
    if (superAdminShell) return;

    const loadProfileName = async () => {
      try {
        const response = await bankConfigAPI.getProfileName();
        if (response?.profileName) setProfileName(response.profileName);
      } catch (err) {
        console.error('Error loading profile name:', err);
      }
    };
    const loadBusinessConfig = async () => {
      try {
        const response = await bankConfigAPI.getOne('000', 'PAYMENT_GATEWAY');
        if (response?.config) setBusinessConfig(response.config);
      } catch (err) {
        console.error('Error loading business config:', err);
      }
    };
    const loadActiveBanks = async () => {
      try {
        const response = await transferConfigAPI.getBankList(true);
        setActiveBanks(response);
      } catch (err) {
        console.error('Error loading active banks:', err);
      }
    };
    const loadAllConfigs = async () => {
      try {
        const response = await bankConfigAPI.getAll();
        setAllConfigs(Array.isArray(response) ? response : []);
      } catch (err) {
        console.error('Error loading configs:', err);
        setAllConfigs([]);
      }
    };
    loadProfileName();
    loadBusinessConfig();
    loadActiveBanks();
    loadAllConfigs();
  }, [selectedPortal?.id, superAdminShell]);

  const homePath = superAdminShell ? '/superadmin/portal-banking' : '/';
  const tickerLabel = superAdminShell ? (user?.username || 'SUPER ADMIN') : profileName;

  const getBankIconPath = (bankCode) => {
    const bankIconMap = { '004': 'KBANK', '014': 'SCB', '002': 'BBL', '025': 'BAY' };
    const iconName = bankIconMap[bankCode];
    return iconName ? `/icon_bank/${iconName}.png` : null;
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autoRefreshDropdownOpen && !e.target.closest('.auto-refresh-dropdown')) {
        setAutoRefreshDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [autoRefreshDropdownOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    const loginPath = logout();
    navigate(loginPath);
  };

  const handleSwitchMerchant = () => {
    exitPortal();
    navigate('/superadmin/portal-banking');
  };

  const isActive = (path) => location.pathname === path;

  const allNavItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/payments', label: 'Payments', icon: CreditCard },
    { path: '/fund-transfers', label: 'Fund Transfers', icon: ArrowLeftRight },
    { path: '/bank-registrations', label: 'Bank Registrations', icon: FileText },
    { path: '/qr-payments', label: 'QR Payments', icon: QrCode, requireFeature: 'qrPayment' },
    { path: '/wallet', label: 'Wallet', icon: Wallet, requireConfig: { bankCode: 'wallet', serviceCode: 'WALLET' } },
    { path: '/members', label: 'Members', icon: Users },
    { path: '/bank-configs', label: 'Configurations', icon: Settings },
  ];

  const superAdminNavItems = [
    { path: '/superadmin/portal-banking', label: 'Portal Banking', icon: Building2 },
  ];

  const navItems = superAdminShell
    ? superAdminNavItems
    : allNavItems.filter((item) => {
        if (item.requireFeature && features[item.requireFeature] !== true) return false;
        if (item.requireConfig) {
          const { bankCode, serviceCode } = item.requireConfig;
          if (!allConfigs.some((c) => c.bankCode === bankCode && c.serviceCode === serviceCode)) {
            return false;
          }
        }
        return true;
      });

  const navLinkClass = (active) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? 'bg-red-600 text-white shadow-sm'
        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
    }`;

  const renderNavLinks = (mobile = false) =>
    navItems.map((item) => {
      const Icon = item.icon;
      const active = isActive(item.path);
      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => mobile && setMobileMenuOpen(false)}
          className={navLinkClass(active)}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span>{item.label}</span>
        </Link>
      );
    });

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-200 transition-colors flex flex-col">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-40 transition-colors shadow-sm">
        {/* Navbar row */}
        <div className="h-14 flex items-center gap-3 px-3 sm:px-4">
          <Link to={homePath} className="flex items-center gap-2 flex-shrink-0" title="ELEGANCE Payment Gateway">
            <img
              src="https://www.elegance.co.th/wp-content/uploads/2025/08/cropped-LogoEleganceSiteIcon-32x32.png"
              alt="ELEGANCE Logo"
              className="w-7 h-7 object-contain"
            />
            <div className="hidden sm:block">
              <h1 className="font-bold text-gray-900 dark:text-white tracking-tight leading-none text-xs transition-colors">
                ELEGANCE
              </h1>
              <span className="text-[8px] text-gray-500 dark:text-slate-400 tracking-widest transition-colors">
                Payment Gateway
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {renderNavLinks()}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-shrink-0">
            {selectedPortal && (
              <div
                className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-500/20"
                title={`Merchant: ${selectedPortal.merchant}${selectedPortal.environment ? ` (${selectedPortal.environment})` : ''}`}
              >
                <span className="text-[10px] uppercase tracking-wider text-red-600 dark:text-red-400 font-semibold">
                  Merchant
                </span>
                <span className="text-xs font-bold text-red-700 dark:text-red-300 uppercase">
                  {selectedPortal.merchant}
                </span>
                {selectedPortal.environment && (
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      selectedPortal.environment === 'PROD'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                    }`}
                  >
                    {selectedPortal.environment}
                  </span>
                )}
              </div>
            )}

            {isSuperAdmin && selectedPortal && (
              <button
                type="button"
                onClick={handleSwitchMerchant}
                title="Switch merchant"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Switch Merchant</span>
              </button>
            )}

            {user && (
              <div
                className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg text-gray-700 dark:text-slate-300"
                title={user.name || user.username}
              >
                <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(user.name || user.username || '?').charAt(0).toUpperCase()}
                </div>
                <span className="hidden xl:inline truncate max-w-[120px] text-xs font-medium">
                  {user.name || user.username}
                </span>
              </div>
            )}

            <div className="relative auto-refresh-dropdown">
              <button
                onClick={() => setAutoRefreshDropdownOpen(!autoRefreshDropdownOpen)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition ${
                  isAutoRefreshActive
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                    : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
                title="Auto refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">
                  {intervalSeconds ? `${intervalSeconds}s` : ''}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {autoRefreshDropdownOpen && (
                <div className="absolute right-0 mt-1 py-1 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
                  {[3, 5, 10].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => {
                        setIntervalSeconds(sec);
                        setAutoRefreshDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition ${
                        intervalSeconds === sec
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Auto refresh {sec}s
                    </button>
                  ))}
                  <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                  <button
                    onClick={() => {
                      setIntervalSeconds(null);
                      setAutoRefreshDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition ${
                      !intervalSeconds
                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleTheme();
              }}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              type="button"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {user && (
              <button
                onClick={handleLogout}
                title="Logout"
                className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Info ticker row — desktop */}
        <div className="hidden md:flex items-center h-9 border-t border-gray-100 dark:border-slate-800 text-xs font-mono text-gray-500 dark:text-slate-400 overflow-x-auto whitespace-nowrap">
          <div
            className="px-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold border-r border-gray-200 dark:border-slate-800 h-full flex items-center tracking-wider transition-colors flex-shrink-0"
            title={superAdminShell ? 'Super Admin' : 'Profile name'}
          >
            {tickerLabel}
          </div>
          <div className="flex items-center px-3 gap-4 min-w-0">
            {superAdminShell ? (
              <span className="text-gray-600 dark:text-slate-300 font-medium">
                Portal Banking Management
              </span>
            ) : (
              businessConfig && (
                <>
                  <span className="flex gap-1.5 text-gray-600 dark:text-slate-300" title="Environment">
                    <Settings className="w-3.5 h-3.5 mt-0.5" />
                    ENV
                    <span
                      className={`font-bold ${
                        businessConfig.scb === 'PROD'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}
                    >
                      {businessConfig.scb || '-'}
                    </span>
                  </span>
                  <span className="flex gap-1.5 text-gray-600 dark:text-slate-300" title="Amount setting type">
                    Amount
                    <span
                      className={`font-bold ${
                        businessConfig.amountSetting?.type === 'FIXED'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {businessConfig.amountSetting?.type || '-'}
                      {businessConfig.amountSetting?.type === 'FIXED' &&
                        ` (${(businessConfig.amountSetting?.value || 1).toFixed(2)} ฿)`}
                    </span>
                  </span>
                  {businessConfig.transferMapping &&
                    (() => {
                      const filteredMappings = Object.entries(businessConfig.transferMapping).filter(
                        ([from, to]) => from !== to,
                      );
                      return (
                        filteredMappings.length > 0 && (
                          <span
                            className="hidden lg:flex items-center gap-1.5 text-gray-600 dark:text-slate-300"
                            title="Sell bank mapping"
                          >
                            Sell
                            <span className="flex items-center gap-1">
                              {filteredMappings.slice(0, 3).map(([from, to]) => {
                                const fromIcon = getBankIconPath(from);
                                const toIcon = getBankIconPath(to);
                                return (
                                  <span
                                    key={`${from}-${to}`}
                                    className="flex items-center gap-0.5 bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded"
                                  >
                                    {fromIcon ? (
                                      <img src={fromIcon} alt={from} className="w-3.5 h-3.5 rounded object-contain" />
                                    ) : (
                                      <span className="text-[10px] font-mono">{from}</span>
                                    )}
                                    <span className="text-green-600 dark:text-green-400 text-[10px]">→</span>
                                    {toIcon ? (
                                      <img src={toIcon} alt={to} className="w-3.5 h-3.5 rounded object-contain" />
                                    ) : (
                                      <span className="text-[10px] font-mono">{to}</span>
                                    )}
                                  </span>
                                );
                              })}
                              {filteredMappings.length > 3 && (
                                <span className="text-[10px] text-gray-400 dark:text-slate-500">
                                  +{filteredMappings.length - 3}
                                </span>
                              )}
                            </span>
                          </span>
                        )
                      );
                    })()}
                  <span className="hidden xl:flex gap-1.5 text-gray-600 dark:text-slate-300" title="KBANK service odd">
                    KBANK{' '}
                    <span className="text-green-600 dark:text-green-400 font-bold">
                      {businessConfig.kbankServiceOdd || '-'}
                    </span>
                  </span>
                  {activeBanks.length > 0 && (
                    <>
                      <span className="text-gray-300 dark:text-slate-700">|</span>
                      {activeBanks.map((bank) => {
                        const iconPath = getBankIconPath(bank.bankCode);
                        return (
                          <span
                            key={bank.id}
                            className="relative flex items-center"
                            title={bank.bankNameEng || bank.bankName || `Bank ${bank.bankCode}`}
                          >
                            {iconPath ? (
                              <>
                                <img
                                  src={iconPath}
                                  alt={bank.bankNameEng}
                                  className="w-5 h-5 rounded object-contain flex-shrink-0"
                                />
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white dark:border-slate-900 ${
                                    bank.isActive ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                />
                              </>
                            ) : (
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  bank.isActive ? 'bg-green-500' : 'bg-red-500'
                                }`}
                              />
                            )}
                          </span>
                        );
                      })}
                    </>
                  )}
                </>
              )
            )}
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 space-y-3 shadow-lg">
            <nav className="flex flex-col gap-1">{renderNavLinks(true)}</nav>

            {selectedPortal && (
              <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-500/20">
                <p className="text-[10px] uppercase tracking-wider text-red-600 dark:text-red-400 font-semibold">
                  Merchant
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-sm font-bold text-red-700 dark:text-red-300 uppercase">
                    {selectedPortal.merchant}
                  </p>
                  {selectedPortal.environment && (
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        selectedPortal.environment === 'PROD'
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                      }`}
                    >
                      {selectedPortal.environment}
                    </span>
                  )}
                </div>
              </div>
            )}

            {isSuperAdmin && selectedPortal && (
              <button
                type="button"
                onClick={() => {
                  handleSwitchMerchant();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Switch Merchant
              </button>
            )}

            {user && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
                    {(user.name || user.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{user.name || user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-x-hidden w-full max-w-full">{children}</main>
    </div>
  );
};

export default Layout;
