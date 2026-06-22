import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Settings, Home, LogOut, User, FileText, Wallet, ArrowLeftRight, Sun, Moon, QrCode, Users, Menu, X, RefreshCw, ChevronDown, CreditCard, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  const [allConfigs, setAllConfigs] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('elegance_sidebar_collapsed') === 'true'; } catch { return false; }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('elegance_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  // Load profile name and business config
  useEffect(() => {
    const loadProfileName = async () => {
      try {
        const response = await bankConfigAPI.getProfileName();
        if (response?.profileName) setProfileName(response.profileName);
        // Keep default value on error
      } catch (err) { console.error('Error loading profile name:', err); }
    };
    const loadBusinessConfig = async () => {
      try {
        const response = await bankConfigAPI.getOne('000', 'PAYMENT_GATEWAY');
        if (response?.config) setBusinessConfig(response.config);
        // Keep default value on error
      } catch (err) { console.error('Error loading business config:', err); }
    };
    const loadActiveBanks = async () => {
      try {
        const response = await transferConfigAPI.getBankList(true);
        // แสดงธนาคารทั้งหมด (ทั้งเปิดและปิด)
        setActiveBanks(response);
      } catch (err) { console.error('Error loading active banks:', err); }
    };
    const loadAllConfigs = async () => {
      try {
        const response = await bankConfigAPI.getAll();
        setAllConfigs(Array.isArray(response) ? response : []);
      } catch (err) { console.error('Error loading configs:', err); setAllConfigs([]); }
    };
    loadProfileName();
    loadBusinessConfig();
    loadActiveBanks();
    loadAllConfigs();
  }, []);

  const getBankIconPath = (bankCode) => {
    const bankIconMap = { '004': 'KBANK', '014': 'SCB', '002': 'BBL', '025': 'BAY' };
    const iconName = bankIconMap[bankCode];
    return iconName ? `/icon_bank/${iconName}.png` : null;
  };

  // Close auto refresh dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autoRefreshDropdownOpen && !e.target.closest('.auto-refresh-dropdown')) setAutoRefreshDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [autoRefreshDropdownOpen]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  // Nav items - filter based on features
  const allNavItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/payments', label: 'Payments', icon: CreditCard },
    { path: '/fund-transfers', label: 'Fund Transfers', icon: ArrowLeftRight },
    { path: '/bank-registrations', label: 'Bank Registrations', icon: FileText },
    { path: '/qr-payments', label: 'QR Payments', icon: QrCode, requireFeature: 'qrPayment' }, // ต้องมี BILL_PAYMENT
    { path: '/wallet', label: 'Wallet', icon: Wallet, requireConfig: { bankCode: 'wallet', serviceCode: 'WALLET' } },
    { path: '/members', label: 'Members', icon: Users },
    { path: '/bank-configs', label: 'Configurations', icon: Settings },
  ];

  // Filter nav items based on features and configs
  const navItems = allNavItems.filter(item => {
    // Check feature requirement
    if (item.requireFeature && features[item.requireFeature] !== true) return false;
    // Check config requirement (for wallet)
    if (item.requireConfig) {
      const { bankCode, serviceCode } = item.requireConfig;
      if (!allConfigs.some(c => c.bankCode === bankCode && c.serviceCode === serviceCode)) return false;
    }
    return true;
  });

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-60';

  const renderSidebarNav = (isMobile = false) => (
    <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => isMobile && setMobileMenuOpen(false)}
            title={item.label}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            } ${(sidebarCollapsed && !isMobile) ? 'justify-center' : ''}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {(!sidebarCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const renderUserSection = (isMobile = false) => (
    user && (
      <div className={`border-t border-gray-200 dark:border-slate-800 p-2 space-y-1 ${(sidebarCollapsed && !isMobile) ? 'flex flex-col items-center' : ''}`}>
        <div
          className={`flex items-center gap-2 w-full px-2 py-2 rounded-lg text-gray-700 dark:text-slate-300 ${(sidebarCollapsed && !isMobile) ? 'justify-center px-0' : ''}`}
          title={user.name || user.username}
        >
          <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(user.name || user.username || '?').charAt(0).toUpperCase()}
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <span className="truncate flex-1 text-left text-xs font-medium">{user.name || user.username}</span>
          )}
        </div>
        <button
          onClick={handleLogout}
          title="Logout"
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:pointer hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer transition-colors ${(sidebarCollapsed && !isMobile) ? 'justify-center px-0' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(!sidebarCollapsed || isMobile) && <span>Logout</span>}
        </button>
      </div>
    )
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-200 transition-colors flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col ${sidebarWidth} bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 fixed inset-y-0 left-0 z-40 transition-all duration-300`}>
        <div className="h-12 flex items-center justify-between px-3 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
          {!sidebarCollapsed && (
            <Link to="/" className="flex items-center gap-2" title="ELEGANCE Payment Gateway">
              <img src="https://www.elegance.co.th/wp-content/uploads/2025/08/cropped-LogoEleganceSiteIcon-32x32.png" alt="ELEGANCE Logo" className="w-6 h-6 object-contain" />
              <div>
                <h1 className="font-bold text-gray-900 dark:text-white tracking-tight leading-none text-xs transition-colors">ELEGANCE</h1>
                <span className="text-[8px] text-gray-500 dark:text-slate-400 tracking-widest transition-colors">Payment Gateway</span>
              </div>
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-6 h-6" /> : <PanelLeftClose className="w-6 h-6" />}
          </button>
        </div>
        {renderSidebarNav(false)}
        {renderUserSection(false)}
      </aside>

      {/* Mobile Overlay Sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col z-50 shadow-xl">
            <div className="h-12 flex items-center justify-between px-4 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
              <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <img src="https://www.elegance.co.th/wp-content/uploads/2025/08/cropped-LogoEleganceSiteIcon-32x32.png" alt="ELEGANCE Logo" className="w-6 h-6 object-contain" />
                <div>
                  <h1 className="font-bold text-gray-900 dark:text-white tracking-tight leading-none text-sm">ELEGANCE</h1>
                  <span className="text-[9px] text-gray-500 dark:text-slate-400 tracking-widest">Payment Gateway</span>
                </div>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            {businessConfig && (
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded text-xs">{profileName}</div>
                <div className="flex justify-between px-1">
                  <span className="text-gray-500 dark:text-slate-400">ENV</span>
                  <span className={`font-bold ${businessConfig.scb === 'PROD' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{businessConfig.scb || '-'}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="text-gray-500 dark:text-slate-400">Amount</span>
                  <span className={`font-bold ${businessConfig.amountSetting?.type === 'FIXED' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                    {businessConfig.amountSetting?.type || '-'}
                    {businessConfig.amountSetting?.type === 'FIXED' && ` (${(businessConfig.amountSetting?.value || 1).toFixed(2)} ฿)`}
                  </span>
                </div>
              </div>
            )}
            {renderSidebarNav(true)}
            {renderUserSection(true)}
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'}`}>
        {/* Top Bar — single row: ticker (left, desktop only) + controls (right) */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-0 z-30 transition-colors shadow-sm">
          <div className="h-12 flex items-center justify-between">
            {/* Left: Mobile hamburger+logo OR Desktop ticker */}
            <div className="flex items-center gap-2 md:hidden px-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              <Link to="/" className="flex items-center gap-1.5">
                <img src="https://www.elegance.co.th/wp-content/uploads/2025/08/cropped-LogoEleganceSiteIcon-32x32.png" alt="ELEGANCE Logo" className="w-5 h-5 object-contain" />
                <span className="font-bold text-gray-900 dark:text-white text-xs">ELEGANCE</span>
              </Link>
            </div>

            {/* Desktop ticker */}
            <div className="hidden md:flex items-center flex-1 min-w-0 overflow-x-auto overflow-y-hidden h-full text-xs font-mono text-gray-500 dark:text-slate-400 whitespace-nowrap">
              <div className="px-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold border-r border-gray-200 dark:border-slate-800 h-full flex items-center tracking-wider transition-colors" title="Profile name">
                {profileName}
              </div>
              <div className="flex items-center px-3 gap-4">
                {businessConfig && (
                  <>
                    <span className="flex gap-1.5 text-gray-600 dark:text-slate-300" title="Environment">
                      <Settings className="w-3.5 h-3.5 mt-0.5" />
                      ENV
                      <span className={`font-bold ${businessConfig.scb === 'PROD' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{businessConfig.scb || '-'}</span>
                    </span>
                    <span className="flex gap-1.5 text-gray-600 dark:text-slate-300" title="Amount setting type">
                      Amount
                      <span className={`font-bold ${businessConfig.amountSetting?.type === 'FIXED' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                        {businessConfig.amountSetting?.type || '-'}
                        {businessConfig.amountSetting?.type === 'FIXED' && ` (${(businessConfig.amountSetting?.value || 1).toFixed(2)} ฿)`}
                      </span>
                    </span>
                    {businessConfig.transferMapping && (() => {
                      const filteredMappings = Object.entries(businessConfig.transferMapping).filter(([from, to]) => from !== to);
                      return filteredMappings.length > 0 && (
                        <span className="hidden lg:flex items-center gap-1.5 text-gray-600 dark:text-slate-300" title="Sell bank mapping">
                          Sell
                          <span className="flex items-center gap-1">
                            {filteredMappings.slice(0, 3).map(([from, to]) => {
                              const fromIcon = getBankIconPath(from);
                              const toIcon = getBankIconPath(to);
                              return (
                                <span key={`${from}-${to}`} className="flex items-center gap-0.5 bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                                  {fromIcon ? <img src={fromIcon} alt={from} className="w-3.5 h-3.5 rounded object-contain" /> : <span className="text-[10px] font-mono">{from}</span>}
                                  <span className="text-green-600 dark:text-green-400 text-[10px]">→</span>
                                  {toIcon ? <img src={toIcon} alt={to} className="w-3.5 h-3.5 rounded object-contain" /> : <span className="text-[10px] font-mono">{to}</span>}
                                </span>
                              );
                            })}
                            {filteredMappings.length > 3 && <span className="text-[10px] text-gray-400 dark:text-slate-500">+{filteredMappings.length - 3}</span>}
                          </span>
                        </span>
                      );
                    })()}
                    <span className="hidden lg:flex gap-1.5 text-gray-600 dark:text-slate-300" title="KBANK service odd">
                      KBANK <span className="text-green-600 dark:text-green-400 font-bold">{businessConfig.kbankServiceOdd || '-'}</span>
                    </span>
                    {activeBanks.length > 0 && (
                      <>
                        <span className="text-gray-300 dark:text-slate-700">|</span>
                        {activeBanks.map((bank) => {
                          const iconPath = getBankIconPath(bank.bankCode);
                          return (
                            <span key={bank.id} className="relative flex items-center" title={bank.bankNameEng || bank.bankName || `Bank ${bank.bankCode}`}>
                              {iconPath ? (
                                <>
                                  <img src={iconPath} alt={bank.bankNameEng} className="w-5 h-5 rounded object-contain flex-shrink-0" />
                                  <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white dark:border-slate-900 ${bank.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                </>
                              ) : (
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${bank.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
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

            {/* Right: Auto Refresh + Theme Toggle (always visible) */}
            <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
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
                        onClick={() => { setIntervalSeconds(sec); setAutoRefreshDropdownOpen(false); }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition ${
                          intervalSeconds === sec ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Auto refresh {sec}s
                      </button>
                    ))}
                    <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                    <button
                      onClick={() => { setIntervalSeconds(null); setAutoRefreshDropdownOpen(false); }}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition ${
                        !intervalSeconds ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleTheme(); }}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 transition-colors"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                type="button"
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
