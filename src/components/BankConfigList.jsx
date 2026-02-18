import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bankConfigAPI, transferConfigAPI } from '../services/api';
import DeleteModal from './DeleteModal';
import { Settings, Plus, Search, X, Eye, Edit, Trash2, Filter, ChevronDown, ChevronUp, Building2, Power } from 'lucide-react';
import AppLoading from './AppLoading';

/**
 * Bank Config List Component
 * หน้าแสดงรายการ Bank Config ทั้งหมด
 * Features:
 * - Table display
 * - Filter/Search
 * - View/Edit/Delete actions
 * - Create new button
 */
const BankConfigList = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [filteredConfigs, setFilteredConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [bankCodeFilter, setBankCodeFilter] = useState('');
  const [serviceCodeFilter, setServiceCodeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Delete modal states
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, config: null });
  const [deleting, setDeleting] = useState(false);
  
  // Business layer section toggle
  const [showBusinessLayer, setShowBusinessLayer] = useState(true);
  
  // Bank configurations section toggle
  const [showBankConfigs, setShowBankConfigs] = useState(true);
  
  // Bank list section
  const [bankList, setBankList] = useState([]);
  const [showBankList, setShowBankList] = useState(true);
  const [loadingBankList, setLoadingBankList] = useState(false);
  const [togglingBank, setTogglingBank] = useState(null); // ID of bank being toggled
  
  // Toggle bank active/inactive confirmation modal
  const [toggleBankModal, setToggleBankModal] = useState({ isOpen: false, bank: null });

  // Fetch data
  useEffect(() => {
    loadConfigs();
    loadBankList();
  }, []);

  // Separate PAYMENT_GATEWAY from other configs
  const paymentGatewayConfig = configs.find(c => c.serviceCode === 'PAYMENT_GATEWAY');
  const bankConfigs = configs.filter(c => c.serviceCode !== 'PAYMENT_GATEWAY');

  // Apply filters (only to bank configs, not PAYMENT_GATEWAY)
  useEffect(() => {
    let filtered = [...bankConfigs];

    // Bank Code filter
    if (bankCodeFilter) {
      filtered = filtered.filter(config => 
        config.bankCode?.toLowerCase().includes(bankCodeFilter.toLowerCase())
      );
    }

    // Service Code filter
    if (serviceCodeFilter) {
      filtered = filtered.filter(config => 
        config.serviceCode?.toLowerCase().includes(serviceCodeFilter.toLowerCase())
      );
    }

    // Search term (searches in both bankCode and serviceCode)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(config => 
        config.bankCode?.toLowerCase().includes(term) ||
        config.serviceCode?.toLowerCase().includes(term)
      );
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setFilteredConfigs(sorted);
  }, [configs, bankCodeFilter, serviceCodeFilter, searchTerm]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bankConfigAPI.getAll();
      
      // ตรวจสอบว่า data เป็น array หรือไม่
      const configsArray = Array.isArray(data) ? data : [];
      
      if (!Array.isArray(data)) {
        console.warn('API response is not an array:', data);
      }
      
      setConfigs(configsArray);
      setFilteredConfigs(configsArray);
    } catch (err) {
      const errorMsg = err.message || err.response?.data?.message || 'Failed to load bank configs';
      setError(errorMsg);
      console.error('Error loading configs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBankList = async () => {
    try {
      setLoadingBankList(true);
      const data = await transferConfigAPI.getBankList();
      setBankList(data);
    } catch (err) {
      console.error('Error loading bank list:', err);
    } finally {
      setLoadingBankList(false);
    }
  };

  const handleToggleBankClick = (bank) => {
    setToggleBankModal({ isOpen: true, bank });
  };

  const handleToggleBankConfirm = async () => {
    if (!toggleBankModal.bank) return;

    try {
      setTogglingBank(toggleBankModal.bank.id);
      await transferConfigAPI.toggleBankActive(toggleBankModal.bank.id);
      // Reload bank list after toggle
      await loadBankList();
      setToggleBankModal({ isOpen: false, bank: null });
    } catch (err) {
      alert(`Failed to toggle bank status: ${err.message}`);
      console.error('Error toggling bank status:', err);
    } finally {
      setTogglingBank(null);
    }
  };

  const handleDelete = (config) => {
    setDeleteModal({ isOpen: true, config });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.config) return;

    try {
      setDeleting(true);
      await bankConfigAPI.delete(deleteModal.config.bankCode, deleteModal.config.serviceCode);
      await loadConfigs();
      setDeleteModal({ isOpen: false, config: null });
    } catch (err) {
      alert(`Failed to delete: ${err.response?.data?.message || err.message}`);
      console.error('Error deleting config:', err);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  const hasActiveFilters = () => {
    return bankCodeFilter || serviceCodeFilter || searchTerm;
  };

  const clearFilters = () => {
    setBankCodeFilter('');
    setServiceCodeFilter('');
    setSearchTerm('');
  };

  // Helper function to get bank icon path
  const getBankIconPath = (bankCode) => {
    const bankIconMap = {
      '004': '/icon_bank/KBANK.png',
      '014': '/icon_bank/SCB.png',
      '002': '/icon_bank/BBL.png',
      '025': '/icon_bank/BAY.png',
    };
    return bankIconMap[bankCode] || null;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors">
        <div className="text-center">
          <AppLoading size="lg" text="Loading bank configurations..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-red-300 dark:border-red-500/30 rounded-lg p-4 shadow-sm transition-colors">
          <p className="text-red-600 dark:text-red-400 text-sm transition-colors">Error: {error}</p>
          <button
            onClick={loadConfigs}
            className="mt-2 px-4 py-2 bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 rounded border border-red-200 dark:border-red-500/30 text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full space-y-6 bg-gray-50 dark:bg-slate-950 min-h-screen transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg p-5 shadow-sm transition-colors">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-red-600 dark:text-red-400 transition-colors" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Configurations</h1>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 transition-colors">Manage business layer and bank configuration settings</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/bank-configs/create')}
            title="Create new bank configuration"
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg shadow-red-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Create New
          </button>
        </div>
      </div>

      {/* Payment Gateway Section (Business Layer) */}
      {paymentGatewayConfig && (
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors">
          <div 
            className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/70"
            onClick={() => setShowBusinessLayer(!showBusinessLayer)}
          >
            <div className="flex items-center gap-2">
              {showBusinessLayer ? (
                <ChevronUp className="w-4 h-4 text-gray-500 dark:text-slate-400 transition-colors" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400 transition-colors" />
              )}
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 transition-colors">
                  <Settings className="w-4 h-4 text-red-600 dark:text-red-400 transition-colors" />
                  Business Layer Configuration
                </h2>
                <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5 transition-colors">
                  System-wide business logic settings
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => navigate(`/bank-configs/view/${paymentGatewayConfig.bankCode}/${paymentGatewayConfig.serviceCode}`)}
                title="View business layer configuration details"
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg text-xs transition-colors"
              >
                <Eye className="w-3 h-3" />
                View
              </button>
              <button
                onClick={() => navigate(`/bank-configs/edit/${paymentGatewayConfig.bankCode}/${paymentGatewayConfig.serviceCode}`)}
                title="Edit business layer configuration"
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg text-xs transition-colors"
              >
                <Edit className="w-3 h-3" />
                Edit
              </button>
            </div>
          </div>
          {showBusinessLayer && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-sm transition-colors" title="SCB API Profile Name">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1 transition-colors">Profile Name</div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm transition-colors">
                  {paymentGatewayConfig.config?.profileName || '-'}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-sm transition-colors" title="SCB API Environment (PROD or UAT)">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1 transition-colors">Environment</div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm transition-colors">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs transition-colors ${
                    paymentGatewayConfig.config?.scb === 'PROD' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  }`}>
                    {paymentGatewayConfig.config?.scb || '-'}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-sm transition-colors" title="Payment amount setting (FIXED or RANDOM)">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1 transition-colors">Amount Setting</div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm transition-colors">
                  {paymentGatewayConfig.config?.amountSetting?.type || '-'}
                  {paymentGatewayConfig.config?.amountSetting?.type === 'FIXED' && 
                    ` (${paymentGatewayConfig.config?.amountSetting?.value || 1} Baht)`
                  }
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3 shadow-sm transition-colors" title="Bank transfer mapping for sell transactions">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1 transition-colors">Sell</div>
                <div className="font-semibold text-gray-900 dark:text-white text-sm transition-colors">
                  {paymentGatewayConfig.config?.transferMapping ? (() => {
                    const differentMappings = Object.entries(paymentGatewayConfig.config.transferMapping)
                      .filter(([from, to]) => from !== to);
                    
                    if (differentMappings.length === 0) {
                      return <span className="text-gray-400 dark:text-slate-500">-</span>;
                    }

                    return (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {differentMappings.map(([from, to]) => {
                          const fromIcon = getBankIconPath(from);
                          const toIcon = getBankIconPath(to);
                          return (
                            <div
                              key={`${from}-${to}`}
                              className="flex items-center gap-1"
                            >
                              {fromIcon ? (
                                <img src={fromIcon} alt={from} className="w-4 h-4 rounded object-contain" />
                              ) : (
                                <span className="text-[10px] font-mono">{from}</span>
                              )}
                              <span className="text-green-600 dark:text-green-400 text-xs mx-0.5">→</span>
                              {toIcon ? (
                                <img src={toIcon} alt={to} className="w-4 h-4 rounded object-contain" />
                              ) : (
                                <span className="text-[10px] font-mono">{to}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })() : '-'}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <div className="text-gray-600 dark:text-slate-400 transition-colors">
                Last updated: <span className="font-mono">{formatDate(paymentGatewayConfig.updatedAt)}</span>
              </div>
              <div className="text-gray-600 dark:text-slate-400 transition-colors">
                Bank Code: <span className="font-mono font-semibold">{paymentGatewayConfig.bankCode}</span>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* Bank List Section */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors">
        <div 
          className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/70"
          onClick={() => setShowBankList(!showBankList)}
        >
          <div className="flex items-center gap-2">
            {showBankList ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-slate-400 transition-colors" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400 transition-colors" />
            )}
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 transition-colors">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 transition-colors" />
                Bank List
              </h2>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5 transition-colors">
                Available banks in the system
              </p>
            </div>
          </div>
          <div className="text-[10px] text-gray-600 dark:text-slate-400 transition-colors">
            {bankList.length} {bankList.length === 1 ? 'bank' : 'banks'}
          </div>
        </div>
        
        {showBankList && (
          <div className="p-5">
            {loadingBankList ? (
              <div className="text-center py-8">
                <AppLoading size="sm" text="Loading banks..." />
              </div>
            ) : bankList.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-slate-500 text-sm">
                No banks found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bankList.map((bank) => {
                  const iconPath = getBankIconPath(bank.bankCode);
                  return (
                    <div
                      key={bank.id}
                      className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {iconPath && (
                          <img 
                            src={iconPath} 
                            alt={bank.bankNameEng} 
                            className="w-10 h-10 rounded object-contain flex-shrink-0 mt-1"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                              {bank.bankNameEng}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              bank.isActive
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                              {bank.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-slate-400 mb-2">
                            {bank.bankNameThai}
                          </p>
                          <div className="text-xs text-gray-500 dark:text-slate-500">
                            <span className="font-mono">{bank.accountNo}</span>
                          </div>
                        </div>
                      <button
                        onClick={() => handleToggleBankClick(bank)}
                        disabled={togglingBank === bank.id}
                        title={bank.isActive ? `Disable ${bank.bankNameEng}` : `Enable ${bank.bankNameEng}`}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          bank.isActive
                            ? 'bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/50'
                            : 'bg-green-50 dark:bg-green-500/20 hover:bg-green-100 dark:hover:bg-green-500/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {togglingBank === bank.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                            <span>...</span>
                          </>
                        ) : (
                          <>
                            <Power className="w-3 h-3" />
                            <span>{bank.isActive ? 'Disable' : 'Enable'}</span>
                          </>
                        )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors">
          <div 
            className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/70"
            onClick={() => setShowBankConfigs(!showBankConfigs)}
          >
          <div className="flex items-center gap-2">
            {showBankConfigs ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-slate-400 transition-colors" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400 transition-colors" />
            )}
            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 transition-colors">
              <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400 transition-colors" />
              Bank Configurations
            </h3>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="text-[10px] text-gray-600 dark:text-slate-400 transition-colors">
              Showing {filteredConfigs.length} of {bankConfigs.length} configurations
              {hasActiveFilters() && ` (filtered)`}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              title={showFilters ? 'Hide filters' : 'Show filters'}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                showFilters || hasActiveFilters()
                  ? 'bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              <Filter className="w-3 h-3" />
              Filters
              {hasActiveFilters() && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  3
                </span>
              )}
            </button>
          </div>
        </div>

        {showBankConfigs && showFilters && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400 transition-colors" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search (Bank Code, Service Code)..."
                  title="Search by bank code or service code"
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              {/* Bank Code Filter */}
              <input
                type="text"
                value={bankCodeFilter}
                onChange={(e) => setBankCodeFilter(e.target.value)}
                placeholder="Filter by Bank Code..."
                title="Filter configurations by bank code (e.g., 004, 014)"
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />

              {/* Service Code Filter */}
              <input
                type="text"
                value={serviceCodeFilter}
                onChange={(e) => setServiceCodeFilter(e.target.value)}
                placeholder="Filter by Service Code..."
                title="Filter configurations by service code (e.g., PAYMENT_INQUIRY, ACCOUNT_VERIFICATION)"
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters() && (
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  title="Clear all active filters"
                  className="flex items-center gap-1 px-3 py-1 bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 border border-red-200 dark:border-red-500/50 rounded text-xs text-red-700 dark:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {showBankConfigs && (
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 transition-colors">
              <tr>
                <th className="px-5 py-3 font-semibold">No.</th>
                <th className="px-5 py-3 font-semibold">Bank Code</th>
                <th className="px-5 py-3 font-semibold">Service Code</th>
                <th className="px-5 py-3 font-semibold">Created At</th>
                <th className="px-5 py-3 font-semibold">Updated At</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-600 dark:text-slate-400 transition-colors">
              {filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-gray-500 dark:text-slate-500 transition-colors">
                    No configurations found
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3 text-gray-700 dark:text-slate-300 font-mono transition-colors">{config.id}</td>
                    <td className="px-5 py-3">
                      <span className="text-gray-900 dark:text-white font-semibold transition-colors">{config.bankCode}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-gray-700 dark:text-slate-300 transition-colors">{config.serviceCode}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 dark:text-slate-400 transition-colors">{formatDate(config.createdAt)}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-slate-400 transition-colors">{formatDate(config.updatedAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/bank-configs/view/${config.bankCode}/${config.serviceCode}`)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/bank-configs/edit/${config.bankCode}/${config.serviceCode}`)}
                          className="p-1.5 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-500/20 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(config)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/20 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Toggle Bank Status Confirmation Modal */}
      {toggleBankModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
              onClick={() => setToggleBankModal({ isOpen: false, bank: null })}
            ></div>

            {/* Center modal */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            {/* Modal panel */}
            <div className="relative inline-block align-bottom bg-white dark:bg-slate-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 dark:border-slate-700">
              <div className="bg-white dark:bg-slate-900 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                    toggleBankModal.bank?.isActive 
                      ? 'bg-red-100 dark:bg-red-900/30' 
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    <Power className={`h-6 w-6 ${
                      toggleBankModal.bank?.isActive 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`} />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      {toggleBankModal.bank?.isActive ? 'Disable Bank' : 'Enable Bank'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        Are you sure you want to {toggleBankModal.bank?.isActive ? 'disable' : 'enable'}{' '}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {toggleBankModal.bank?.bankNameEng}
                        </span>
                        {' '}({toggleBankModal.bank?.bankNameThai})?
                      </p>
                      {toggleBankModal.bank?.isActive && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                          ⚠️ Disabling this bank will prevent it from being used for transactions.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                <button
                  type="button"
                  disabled={togglingBank === toggleBankModal.bank?.id}
                  onClick={handleToggleBankConfirm}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    toggleBankModal.bank?.isActive
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700'
                  }`}
                >
                  {togglingBank === toggleBankModal.bank?.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {toggleBankModal.bank?.isActive ? 'Disable' : 'Enable'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={togglingBank === toggleBankModal.bank?.id}
                  onClick={() => setToggleBankModal({ isOpen: false, bank: null })}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, config: null })}
        onConfirm={handleDeleteConfirm}
        bankCode={deleteModal.config?.bankCode}
        serviceCode={deleteModal.config?.serviceCode}
        isLoading={deleting}
      />
    </div>
  );
};

export default BankConfigList;
