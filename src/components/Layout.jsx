import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Settings, Home, LogOut, User, FileText, Wallet, ArrowLeftRight, Sun, Moon, QrCode, Users, Menu, X, RefreshCw, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFeatures } from '../contexts/FeatureContext';
import { useAutoRefresh } from '../contexts/AutoRefreshContext';
import { bankConfigAPI, transferConfigAPI } from '../services/api';

/**
 * Layout Component with Navbar
 * Layout หลักที่มี Navbar สำหรับเลือกเมนู
 */
const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { features } = useFeatures();
  const { intervalSeconds, setIntervalSeconds, isActive: isAutoRefreshActive } = useAutoRefresh();
  const [autoRefreshDropdownOpen, setAutoRefreshDropdownOpen] = useState(false);
  const [profileName, setProfileName] = useState('profileName');
  const [businessConfig, setBusinessConfig] = useState(null);
  const [activeBanks, setActiveBanks] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Load profile name and business config
  useEffect(() => {
    const loadProfileName = async () => {
      try {
        const response = await bankConfigAPI.getProfileName();
        if (response?.profileName) {
          setProfileName(response.profileName);
        }
      } catch (err) {
        console.error('Error loading profile name:', err);
        // Keep default value on error
      }
    };
    
    const loadBusinessConfig = async () => {
      try {
        const response = await bankConfigAPI.getOne('000', 'PAYMENT_GATEWAY');
        if (response?.config) {
          setBusinessConfig(response.config);
        }
      } catch (err) {
        console.error('Error loading business config:', err);
        // Keep default value on error
      }
    };
    
    const loadActiveBanks = async () => {
      try {
        const response = await transferConfigAPI.getBankList(true);
        // แสดงธนาคารทั้งหมด (ทั้งเปิดและปิด)
        setActiveBanks(response);
      } catch (err) {
        console.error('Error loading active banks:', err);
      }
    };
    
    loadProfileName();
    loadBusinessConfig();
    loadActiveBanks();
  }, []);

  const getBankIconPath = (bankCode) => {
    const bankIconMap = {
      '004': 'KBANK',
      '014': 'SCB',
      '002': 'BBL',
      '025': 'BAY',
    };
    const iconName = bankIconMap[bankCode];
    return iconName ? `/icon_bank/${iconName}.png` : null;
  };

  
  // Close auto refresh dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autoRefreshDropdownOpen && !e.target.closest('.auto-refresh-dropdown')) {
        setAutoRefreshDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [autoRefreshDropdownOpen]);

  // Debug: Log theme changes
  useEffect(() => {
    console.log('Layout: theme changed to', theme, 'isDark:', isDark);
    console.log('Root element classes:', document.documentElement.className);
  }, [theme, isDark]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Nav items - filter based on features
  const allNavItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/payments', label: 'Payments', icon: Wallet },
    { path: '/fund-transfers', label: 'Fund Transfers', icon: ArrowLeftRight },
    { path: '/bank-registrations', label: 'Bank Registrations', icon: FileText },
    { path: '/qr-payments', label: 'QR Payments', icon: QrCode, requireFeature: 'qrPayment' }, // ต้องมี BILL_PAYMENT
    { path: '/members', label: 'Members', icon: Users },
    { path: '/bank-configs', label: 'Bank Configurations', icon: Settings },
  ];

  // Filter nav items based on features
  const navItems = allNavItems.filter(item => {
    if (item.requireFeature) {
      return features[item.requireFeature] === true;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-200 transition-colors">
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-50 transition-colors shadow-sm">
        {/* Market Ticker - ซ่อนบนมือถือ แสดงบน Desktop */}
        <div className="hidden lg:flex bg-gray-50 dark:bg-slate-950 h-8 items-center border-b border-gray-100 dark:border-slate-800 overflow-x-auto overflow-y-hidden text-xs font-mono text-gray-500 dark:text-slate-400 transition-colors">
          <div className="px-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold border-r border-gray-200 dark:border-slate-800 h-full flex items-center tracking-wider transition-colors whitespace-nowrap" title="Profile name">
            {profileName}
          </div>
          <div className="flex items-center px-4 gap-3 md:gap-6 whitespace-nowrap">
            {businessConfig && (
              <>
                <span className="flex gap-1 md:gap-2 text-gray-600 dark:text-slate-300" title="Environment">
                  <Settings className="w-3.5 h-3.5 mt-0.5" />
                  <span className="hidden sm:inline">ENV</span>
                  <span className={`font-bold ${
                    businessConfig.scb === 'PROD' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>{businessConfig.scb || '-'}</span>
                </span>
                <span className="flex gap-1 md:gap-2 text-gray-600 dark:text-slate-300" title="Amount setting type">
                  <span className="hidden sm:inline">Amount</span>
                  <span className={`font-bold ${
                    businessConfig.amountSetting?.type === 'FIXED'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {businessConfig.amountSetting?.type || '-'}
                    {businessConfig.amountSetting?.type === 'FIXED' && ` (${(businessConfig.amountSetting?.value || 1).toFixed(2)} ฿)`}
                  </span>
                </span>
                {businessConfig.transferMapping && (() => {
                  const filteredMappings = Object.entries(businessConfig.transferMapping).filter(([from, to]) => from !== to);
                  return filteredMappings.length > 0 && (
                    <span className="hidden md:flex items-center gap-2 text-gray-600 dark:text-slate-300" title="Sell bank mapping">
                      <span className="whitespace-nowrap">Sell</span>
                      <span className="flex items-center gap-1.5 flex-wrap">
                        {filteredMappings.slice(0, 3).map(([from, to], index) => {
                          const fromIcon = getBankIconPath(from);
                          const toIcon = getBankIconPath(to);
                          return (
                            <span key={`${from}-${to}`} className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {fromIcon ? (
                                <img src={fromIcon} alt={from} className="w-4 h-4 rounded object-contain" />
                              ) : (
                                <span className="text-[10px] font-mono">{from}</span>
                              )}
                              <span className="text-green-600 dark:text-green-400 text-[10px]">→</span>
                              {toIcon ? (
                                <img src={toIcon} alt={to} className="w-4 h-4 rounded object-contain" />
                              ) : (
                                <span className="text-[10px] font-mono">{to}</span>
                              )}
                            </span>
                          );
                        })}
                        {filteredMappings.length > 3 && (
                          <span className="text-xs text-gray-400 dark:text-slate-500">+{filteredMappings.length - 3}</span>
                        )}
                      </span>
                    </span>
                  );
                })()}
                <span className="hidden lg:flex gap-2 text-gray-600 dark:text-slate-300" title="KBANK service odd">
                  KBANK <span className="text-green-600 dark:text-green-400 font-bold">{businessConfig.kbankServiceOdd || '-'}</span>
                </span>
                {activeBanks.length > 0 && (
                  <>
                    <span className="text-gray-400 dark:text-slate-600">|</span>
                    {activeBanks.map((bank) => {
                      const iconPath = getBankIconPath(bank.bankCode);
                      return (
                        <span key={bank.id} className="relative flex items-center" title={bank.bankNameEng || bank.bankName || `Bank ${bank.bankCode}`}>
                          {iconPath ? (
                            <>
                              <img 
                                src={iconPath} 
                                alt={bank.bankNameEng} 
                                className="w-6 h-6 rounded object-contain flex-shrink-0"
                              />
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-950 ${
                                bank.isActive 
                                  ? 'bg-green-500 dark:bg-green-400' 
                                  : 'bg-red-500 dark:bg-red-400'
                              }`}></span>
                            </>
                          ) : (
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              bank.isActive 
                                ? 'bg-green-500 dark:bg-green-400' 
                                : 'bg-red-500 dark:bg-red-400'
                            }`}></span>
                          )}
            </span>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Nav */}
        <div className="h-14 px-3 md:px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-6 flex-1">
            {/* Hamburger Button (Mobile) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 transition-colors"
              aria-label="Toggle menu"
              title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 flex-shrink-0" title="ELEGANCE Payment Gateway - Home">
              <img 
                src="https://www.elegance.co.th/wp-content/uploads/2025/08/cropped-LogoEleganceSiteIcon-32x32.png"
                alt="ELEGANCE Logo"
                className="w-6 h-6 object-contain"
              />
              <div className="hidden sm:block">
                <h1 className="font-bold text-gray-900 dark:text-white tracking-tight leading-none text-base transition-colors">ELEGANCE</h1>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 tracking-widest transition-colors">Payment Gateway</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:block h-6 w-px bg-gray-200 dark:bg-slate-700" aria-hidden="true"></div>
            <nav className="hidden lg:flex gap-1 flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={`Go to ${item.label}`}
                    className={`px-4 py-1.5 rounded text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${
                      active
                        ? 'bg-red-600 text-white shadow-inner'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {/* Auto Refresh Dropdown */}
            <div className="relative auto-refresh-dropdown">
              <button
                onClick={() => setAutoRefreshDropdownOpen(!autoRefreshDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition ${
                  isAutoRefreshActive
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                    : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
                title="Auto refresh"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {intervalSeconds ? `Auto ${intervalSeconds}s` : 'Auto refresh off'}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {autoRefreshDropdownOpen && (
                <div className="absolute right-0 mt-1 py-1 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => { setIntervalSeconds(3); setAutoRefreshDropdownOpen(false); }}
                    title="Refresh page every 3 seconds"
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition ${
                      intervalSeconds === 3 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Auto refresh 3s
                  </button>
                  <button
                    onClick={() => { setIntervalSeconds(5); setAutoRefreshDropdownOpen(false); }}
                    title="Refresh page every 5 seconds"
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition ${
                      intervalSeconds === 5 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Auto refresh 5s
                  </button>
                  <button
                    onClick={() => { setIntervalSeconds(10); setAutoRefreshDropdownOpen(false); }}
                    title="Refresh page every 10 seconds"
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition ${
                      intervalSeconds === 10 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Auto refresh 10s
                  </button>
                  <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                  <button
                    onClick={() => { setIntervalSeconds(null); setAutoRefreshDropdownOpen(false); }}
                    title="Disable auto refresh"
                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition ${
                      !intervalSeconds ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleTheme();
              }}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              type="button"
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* <div className="flex flex-col items-end mr-2">
              <span className="text-[10px] text-gray-500 dark:text-slate-400 uppercase transition-colors">System Status</span>
              <span className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 animate-pulse"></span>
                OPERATIONAL
              </span>
            </div> */}
            
            {/* User Info & Logout */}
            {user && (
              <>
                <div className="hidden md:block h-6 w-px bg-gray-200 dark:bg-slate-700" aria-hidden="true"></div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors" title={`Logged in as ${user.name || user.username}`}>
                    <User className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                    <span className="text-xs text-gray-700 dark:text-slate-300 hidden md:inline">{user.name || user.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-red-600 border border-gray-200 dark:border-slate-700 hover:border-red-500 rounded-lg text-xs text-gray-700 dark:text-slate-300 hover:text-white transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden md:inline">Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
            {/* Profile Name */}
            <div className="px-3 pt-4 pb-3 border-b border-gray-200 dark:border-slate-800">
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-sm rounded-lg">
                {profileName}
              </div>
            </div>

            {/* Business Config Info */}
            {businessConfig && (
              <div className="px-3 pt-3 pb-3 border-b border-gray-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 px-4">System Configuration</div>
                <div className="space-y-2 px-4">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Environment</span>
                    <span className={`text-sm font-bold ${
                      businessConfig.scb === 'PROD' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`}>{businessConfig.scb || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Amount Setting</span>
                    <span className={`text-sm font-bold ${
                      businessConfig.amountSetting?.type === 'FIXED'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {businessConfig.amountSetting?.type || '-'}
                      {businessConfig.amountSetting?.type === 'FIXED' && ` (${(businessConfig.amountSetting?.value || 1).toFixed(2)} ฿)`}
                    </span>
                  </div>
                  {businessConfig.transferMapping && (() => {
                    const filteredMappings = Object.entries(businessConfig.transferMapping).filter(([from, to]) => from !== to);
                    return filteredMappings.length > 0 && (
                      <div className="py-1.5">
                        <span className="text-sm text-gray-600 dark:text-slate-400 mb-2 block">Sell</span>
                        <div className="space-y-2">
                          {filteredMappings.map(([from, to]) => {
                            const fromIcon = getBankIconPath(from);
                            const toIcon = getBankIconPath(to);
                            return (
                              <div key={`${from}-${to}`} className="flex items-center justify-end gap-2">
                                <div className="flex items-center gap-1.5">
                                  {fromIcon ? (
                                    <img src={fromIcon} alt={from} className="w-6 h-6 rounded object-contain" />
                                  ) : (
                                    <span className="text-xs font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">{from}</span>
                                  )}
                                  <span className="text-green-600 dark:text-green-400">→</span>
                                  {toIcon ? (
                                    <img src={toIcon} alt={to} className="w-6 h-6 rounded object-contain" />
                                  ) : (
                                    <span className="text-xs font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">{to}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600 dark:text-slate-400">KBANK Service</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{businessConfig.kbankServiceOdd || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Active Banks */}
            {activeBanks.length > 0 && (
              <div className="px-3 pt-3 pb-3 border-b border-gray-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 px-4">Active Banks</div>
                <div className="space-y-2 px-4">
                  {activeBanks.map((bank) => {
                    const iconPath = getBankIconPath(bank.bankCode);
                    return (
                      <div key={bank.id} className="flex items-center gap-2.5 py-1.5">
                        {iconPath ? (
                          <img 
                            src={iconPath} 
                            alt={bank.bankNameEng} 
                            className="w-6 h-6 rounded object-contain flex-shrink-0"
                          />
                        ) : (
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            bank.isActive 
                              ? 'bg-green-500 dark:bg-green-400' 
                              : 'bg-red-500 dark:bg-red-400'
                          }`}></span>
                        )}
                        <span className="text-sm text-gray-700 dark:text-slate-300">{bank.bankNameEng}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation Menu */}
            <nav className="px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    title={`Go to ${item.label}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                      active
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;

