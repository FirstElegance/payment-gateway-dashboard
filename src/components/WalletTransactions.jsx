import { useState, useEffect, useMemo, useRef } from 'react';
import { walletAPI, membersAPI, paymentRegistrationsAPI } from '../services/api';
import { Search, Filter, X, Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Users, Building2, BarChart2, ZoomIn, ZoomOut, RotateCcw, Calendar, Maximize2, Minimize2 } from 'lucide-react';
import AppLoading from './AppLoading';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import WalletFlowTVChart from './WalletFlowTVChart';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-day-picker/style.css';

// Register Chart.js components (for Doughnut only)
ChartJS.register(
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

/**
 * Wallet Component
 * หน้าแสดงรายการ Wallets และธุรกรรม
 */
const WalletTransactions = () => {
  console.log('🔄 WalletTransactions component mounting...');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wallets'); // 'wallets' | 'deposits' | 'withdrawals'
  const walletFlowChartRef = useRef(null);
  const [walletFlowFullscreen, setWalletFlowFullscreen] = useState(false);
  
  // Date filter for chart
  const [walletFlowRange, setWalletFlowRange] = useState({
    preset: 'today', // 'today' | '7d' | '30d' | 'custom'
    from: '',
    to: '',
  });
  const [walletFlowFromPickerOpen, setWalletFlowFromPickerOpen] = useState(false);
  const [walletFlowToPickerOpen, setWalletFlowToPickerOpen] = useState(false);
  const walletFlowDatePickerRef = useRef(null);
  
  // Member filter for chart
  const [selectedMemberId, setSelectedMemberId] = useState(''); // '' = all members
  const [members, setMembers] = useState([]);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all'); // 'all' | 'deposits' | 'withdrawals'
  
  // Wallets
  const [wallets, setWallets] = useState([]);
  const [allWallets, setAllWallets] = useState([]);
  
  // Deposits
  const [deposits, setDeposits] = useState([]);
  const [allDeposits, setAllDeposits] = useState([]);
  
  // Withdrawals
  const [withdrawals, setWithdrawals] = useState([]);
  const [allWithdrawals, setAllWithdrawals] = useState([]);
  
  const [activeMerchantWallet, setActiveMerchantWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
  });
  
  // Wallet detail modal with transactions
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Payment detail modal (for deposit ref)
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (walletFlowDatePickerRef.current && !walletFlowDatePickerRef.current.contains(event.target)) {
        setWalletFlowFromPickerOpen(false);
        setWalletFlowToPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC to close fullscreen chart
  useEffect(() => {
    if (!walletFlowFullscreen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setWalletFlowFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [walletFlowFullscreen]);

  // Load initial data
  useEffect(() => {
    loadActiveMerchantWallet();
    loadAllWallets();
    loadMembers();
  }, []);

  // Reload deposits/withdrawals when member, date range, or transaction type changes
  useEffect(() => {
    console.log('🔄 Filter changed:', { selectedMemberId, transactionTypeFilter, preset: walletFlowRange.preset });
    if (!selectedMemberId || transactionTypeFilter === 'all' || transactionTypeFilter === 'deposits') {
      loadAllDeposits();
    } else {
      setAllDeposits([]);
    }
    if (!selectedMemberId || transactionTypeFilter === 'all' || transactionTypeFilter === 'withdrawals') {
      loadAllWithdrawals();
    } else {
      setAllWithdrawals([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId, transactionTypeFilter, walletFlowRange.preset, walletFlowRange.from, walletFlowRange.to]);

  // Prepare chart data - Time series for deposits and withdrawals
  // Helper function to parse local date
  const parseLocalDate = (ymd) => {
    if (!ymd) return null;
    try {
      return new Date(`${ymd}T00:00:00`);
    } catch {
      return null;
    }
  };

  // Filter deposits/withdrawals by date range and transaction type for chart
  const filteredDepositsForChart = useMemo(() => {
    // If member is selected and transactionTypeFilter is 'withdrawals', return empty
    if (selectedMemberId && transactionTypeFilter === 'withdrawals') {
      return [];
    }
    const toYmd = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const now = new Date();
    let dateFrom = '';
    let dateTo = '';

    if (walletFlowRange.preset === 'today') {
      const ymd = toYmd(now);
      dateFrom = ymd;
      dateTo = ymd;
    } else if (walletFlowRange.preset === '7d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      dateFrom = toYmd(start);
      dateTo = toYmd(now);
    } else if (walletFlowRange.preset === '30d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      dateFrom = toYmd(start);
      dateTo = toYmd(now);
    } else {
      dateFrom = walletFlowRange.from || '';
      dateTo = walletFlowRange.to || '';
    }

    if (!dateFrom && !dateTo) return allDeposits;

    const startMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const endMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return (allDeposits || []).filter(d => {
      if (!d.createdAt) return false;
      const t = new Date(d.createdAt).getTime();
      if (startMs !== null && t < startMs) return false;
      if (endMs !== null && t > endMs) return false;
      return true;
    });
  }, [allDeposits, walletFlowRange, selectedMemberId, transactionTypeFilter]);

  const filteredWithdrawalsForChart = useMemo(() => {
    // If member is selected and transactionTypeFilter is 'deposits', return empty
    if (selectedMemberId && transactionTypeFilter === 'deposits') {
      return [];
    }
    const toYmd = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const now = new Date();
    let dateFrom = '';
    let dateTo = '';

    if (walletFlowRange.preset === 'today') {
      const ymd = toYmd(now);
      dateFrom = ymd;
      dateTo = ymd;
    } else if (walletFlowRange.preset === '7d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      dateFrom = toYmd(start);
      dateTo = toYmd(now);
    } else if (walletFlowRange.preset === '30d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      dateFrom = toYmd(start);
      dateTo = toYmd(now);
    } else {
      dateFrom = walletFlowRange.from || '';
      dateTo = walletFlowRange.to || '';
    }

    if (!dateFrom && !dateTo) return allWithdrawals;

    const startMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const endMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return (allWithdrawals || []).filter(w => {
      if (!w.createdAt) return false;
      const t = new Date(w.createdAt).getTime();
      if (startMs !== null && t < startMs) return false;
      if (endMs !== null && t > endMs) return false;
      return true;
    });
  }, [allWithdrawals, walletFlowRange, selectedMemberId, transactionTypeFilter]);

  // Distribution data
  const totalDeposits = useMemo(() => {
    return (Array.isArray(allDeposits) ? allDeposits : []).reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
  }, [allDeposits]);

  const totalWithdrawals = useMemo(() => {
    return (Array.isArray(allWithdrawals) ? allWithdrawals : []).reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
  }, [allWithdrawals]);

  const distributionData = {
    labels: ['Deposits', 'Withdrawals'],
    datasets: [
      {
        data: [totalDeposits, totalWithdrawals],
        backgroundColor: ['#22c55e', '#f97316'],
        borderWidth: 0,
      },
    ],
  };

  // Client-side filter and pagination for Wallets
  useEffect(() => {
    if (activeTab !== 'wallets' || !Array.isArray(allWallets)) return;
    
    const limit = pagination.limit;
    const page = pagination.page;
    const f = filters;
    
    // Filter
    const filtered = allWallets.filter((wallet) => {
      // ไม่แสดง MERCHANT wallets
      if ((wallet.walletType || '').toUpperCase() === 'MERCHANT') {
        return false;
      }
      
      // Search filter
      if (f.search) {
        const s = f.search.toLowerCase();
        const match = (wallet.walletId || '').toLowerCase().includes(s) || 
                     (wallet.memberId || '').toLowerCase().includes(s) ||
                     (wallet.memberName || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      
      // Status filter
      if (f.status !== 'all' && (wallet.status || '').toUpperCase() !== f.status) {
        return false;
      }
      
      return true;
    });
    
    // Sort by date desc
    const sorted = [...filtered].sort((a, b) => 
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    
    // Paginate
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = sorted.slice(start, end);
    
    setWallets(paginated);
    setPagination(prev => ({ ...prev, total, totalPages }));
  }, [activeTab, allWallets, filters, pagination.page, pagination.limit]);

  // Client-side filter and pagination for Deposits
  useEffect(() => {
    if (activeTab !== 'deposits' || !Array.isArray(allDeposits)) return;
    
    const limit = pagination.limit;
    const page = pagination.page;
    const f = filters;
    
    // Filter
    const filtered = allDeposits.filter((deposit) => {
      // Search filter
      if (f.search) {
        const s = f.search.toLowerCase();
        const match = (deposit.id || '').toLowerCase().includes(s) || 
                     (deposit.ref || '').toLowerCase().includes(s) ||
                     (deposit.walletId || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      
      // Status filter
      if (f.status !== 'all' && (deposit.status || '').toUpperCase() !== f.status) {
        return false;
      }
      
      return true;
    });
    
    // Sort by date desc
    const sorted = [...filtered].sort((a, b) => 
      new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0)
    );
    
    // Paginate
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = sorted.slice(start, end);
    
    setDeposits(paginated);
    setPagination(prev => ({ ...prev, total, totalPages }));
  }, [activeTab, allDeposits, filters, pagination.page, pagination.limit]);

  // Client-side filter and pagination for Withdrawals
  useEffect(() => {
    if (activeTab !== 'withdrawals' || !Array.isArray(allWithdrawals)) return;
    
    const limit = pagination.limit;
    const page = pagination.page;
    const f = filters;
    
    // Filter
    const filtered = allWithdrawals.filter((withdrawal) => {
      // Search filter
      if (f.search) {
        const s = f.search.toLowerCase();
        const match = (withdrawal.id || '').toLowerCase().includes(s) || 
                     (withdrawal.ref || '').toLowerCase().includes(s) ||
                     (withdrawal.walletId || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      
      // Status filter
      if (f.status !== 'all' && (withdrawal.status || '').toUpperCase() !== f.status) {
        return false;
      }
      
      return true;
    });
    
    // Sort by date desc
    const sorted = [...filtered].sort((a, b) => 
      new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0)
    );
    
    // Paginate
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = sorted.slice(start, end);
    
    setWithdrawals(paginated);
    setPagination(prev => ({ ...prev, total, totalPages }));
  }, [activeTab, allWithdrawals, filters, pagination.page, pagination.limit]);

  // Reset to page 1 when filters or tab change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [filters.search, filters.status, activeTab]);

  const loadActiveMerchantWallet = async () => {
    try {
      setLoadingWallet(true);
      const data = await walletAPI.getActiveMerchantWallet();
      console.log('✅ Active merchant wallet loaded:', data);
      setActiveMerchantWallet(data);
    } catch (err) {
      console.error('❌ Error loading active merchant wallet:', err);
      setActiveMerchantWallet(null);
    } finally {
      setLoadingWallet(false);
    }
  };

  const loadAllWallets = async () => {
    try {
      setLoading(true);
      const data = await walletAPI.getAllWallets();
      console.log('📊 All wallets loaded:', data);
      
      const walletsArray = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      console.log('📊 Parsed wallets:', walletsArray.length, 'records');
      
      setAllWallets(walletsArray);
    } catch (err) {
      console.error('❌ Error loading wallets:', err);
      setAllWallets([]);
    } finally {
      setLoading(false);
      setHasInitialLoad(true);
    }
  };

  const loadAllDeposits = async () => {
    try {
      let data;
      if (selectedMemberId) {
        // Use new unified endpoint
        const toYmd = (d) => {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        };
        const now = new Date();
        let startDate = '';
        let endDate = '';

        if (walletFlowRange.preset === 'today') {
          const ymd = toYmd(now);
          startDate = ymd;
          endDate = ymd;
        } else if (walletFlowRange.preset === '7d') {
          const start = new Date(now);
          start.setDate(now.getDate() - 6);
          startDate = toYmd(start);
          endDate = toYmd(now);
        } else if (walletFlowRange.preset === '30d') {
          const start = new Date(now);
          start.setDate(now.getDate() - 29);
          startDate = toYmd(start);
          endDate = toYmd(now);
        } else if (walletFlowRange.preset === 'custom') {
          startDate = walletFlowRange.from || '';
          endDate = walletFlowRange.to || '';
        }

        const params = {};
        // Use transaction type filter if it's 'all' or 'deposits'
        if (transactionTypeFilter === 'all' || transactionTypeFilter === 'deposits') {
          params.filter = transactionTypeFilter === 'all' ? 'all' : 'deposits';
        } else {
          // If filter is 'withdrawals', don't fetch deposits
          setAllDeposits([]);
          return;
        }
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        data = await walletAPI.getMemberHistory(selectedMemberId, params);
        // If filter is 'all', we need to separate deposits from withdrawals
        if (transactionTypeFilter === 'all') {
          const depositsArray = Array.isArray(data) ? data.filter(item => item.type === 'DEPOSIT' || !item.type) : [];
          console.log('📊 Deposits from history (all):', depositsArray.length, 'records');
          setAllDeposits(depositsArray);
          return;
        }
      } else {
        data = await walletAPI.getAllDeposits();
      }
      console.log('📊 All deposits loaded:', data);
      
      const depositsArray = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      console.log('📊 Parsed deposits:', depositsArray.length, 'records');
      
      setAllDeposits(depositsArray);
    } catch (err) {
      console.error('❌ Error loading deposits:', err);
      setAllDeposits([]);
    }
  };

  const loadAllWithdrawals = async () => {
    try {
      let data;
      if (selectedMemberId) {
        // Use new unified endpoint
        const toYmd = (d) => {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        };
        const now = new Date();
        let startDate = '';
        let endDate = '';

        if (walletFlowRange.preset === 'today') {
          const ymd = toYmd(now);
          startDate = ymd;
          endDate = ymd;
        } else if (walletFlowRange.preset === '7d') {
          const start = new Date(now);
          start.setDate(now.getDate() - 6);
          startDate = toYmd(start);
          endDate = toYmd(now);
        } else if (walletFlowRange.preset === '30d') {
          const start = new Date(now);
          start.setDate(now.getDate() - 29);
          startDate = toYmd(start);
          endDate = toYmd(now);
        } else if (walletFlowRange.preset === 'custom') {
          startDate = walletFlowRange.from || '';
          endDate = walletFlowRange.to || '';
        }

        const params = {};
        // Use transaction type filter if it's 'all' or 'withdrawals'
        if (transactionTypeFilter === 'all' || transactionTypeFilter === 'withdrawals') {
          params.filter = transactionTypeFilter === 'all' ? 'all' : 'withdrawals';
        } else {
          // If filter is 'deposits', don't fetch withdrawals
          setAllWithdrawals([]);
          return;
        }
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        data = await walletAPI.getMemberHistory(selectedMemberId, params);
        // If filter is 'all', we need to separate withdrawals from deposits
        if (transactionTypeFilter === 'all') {
          const withdrawalsArray = Array.isArray(data) ? data.filter(item => item.type === 'WITHDRAWAL') : [];
          console.log('📊 Withdrawals from history (all):', withdrawalsArray.length, 'records');
          setAllWithdrawals(withdrawalsArray);
          return;
        }
      } else {
        data = await walletAPI.getAllWithdrawals();
      }
      console.log('📊 All withdrawals loaded:', data);
      
      const withdrawalsArray = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      console.log('📊 Parsed withdrawals:', withdrawalsArray.length, 'records');
      
      setAllWithdrawals(withdrawalsArray);
    } catch (err) {
      console.error('❌ Error loading withdrawals:', err);
      setAllWithdrawals([]);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await membersAPI.getAll();
      console.log('📊 Members loaded:', data);
      const membersArray = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      console.log('📊 Parsed members:', membersArray.length, 'records');
      setMembers(membersArray);
    } catch (err) {
      console.error('❌ Error loading members:', err);
      setMembers([]);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return { date: '-', time: '-' };
    try {
      const date = new Date(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const dateStr = `${day} ${month} ${year}`;
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}:${seconds}`;
      return { date: dateStr, time: timeStr };
    } catch {
      return { date: dateString, time: '' };
    }
  };

  const formatThaiBaht = (amount) => {
    if (!amount) return '฿0.00';
    try {
      const formatted = parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return `฿${formatted}`;
    } catch {
      return `฿${amount}`;
    }
  };

  const hasActiveFilters = () => {
    return filters.search || filters.status !== 'all';
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleWalletClick = async (wallet) => {
    try {
      setLoadingDetail(true);
      setDetailModalOpen(true);
      
      // Load wallet details with deposits and withdrawals
      try {
        const data = await walletAPI.getWalletById(wallet.walletId);
        console.log('📊 Wallet detail:', data);
        setSelectedWallet(data);
        
        // Combine deposits and withdrawals
        const deposits = (data.deposits || []).map(d => ({ ...d, type: 'DEPOSIT' }));
        const withdrawals = (data.withdrawals || []).map(w => ({ ...w, type: 'WITHDRAWAL' }));
        const allTransactions = [...deposits, ...withdrawals].sort((a, b) => 
          new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        
        console.log('📊 Combined transactions:', allTransactions.length, 'records');
        setWalletTransactions(allTransactions);
      } catch (err) {
        console.error('Error loading wallet details:', err);
        setSelectedWallet(wallet);
        setWalletTransactions([]);
      }
    } catch (err) {
      console.error('Error opening wallet details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDepositClick = async (deposit) => {
    try {
      setLoadingDetail(true);
      setDetailModalOpen(true);
      
      // Load deposit details with bankPaymentDetail
      try {
        const detail = await walletAPI.getDepositById(deposit.id);
        console.log('📊 Deposit detail with bankPaymentDetail:', detail);
        setSelectedWallet({ ...detail, _type: 'deposit' });
      } catch (err) {
        console.error('Error loading deposit details:', err);
        setSelectedWallet({ ...deposit, _type: 'deposit' });
      }
    } catch (err) {
      console.error('Error opening deposit details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleWithdrawalClick = async (withdrawal) => {
    try {
      setLoadingDetail(true);
      setDetailModalOpen(true);
      
      // Load withdrawal details with fundTransferDetail
      try {
        const detail = await walletAPI.getWithdrawalById(withdrawal.id);
        console.log('📊 Withdrawal detail with fundTransferDetail:', detail);
        setSelectedWallet({ ...detail, _type: 'withdrawal' });
      } catch (err) {
        console.error('Error loading withdrawal details:', err);
        setSelectedWallet({ ...withdrawal, _type: 'withdrawal' });
      }
    } catch (err) {
      console.error('Error opening withdrawal details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedWallet(null);
    setWalletTransactions([]);
  };

  const handlePaymentRefClick = async (ref, e) => {
    e.stopPropagation();
    
    try {
      setLoadingPayment(true);
      setPaymentModalOpen(true);
      
      const data = await paymentRegistrationsAPI.getById(ref);
      console.log('📊 Payment detail:', data);
      setSelectedPayment(data);
    } catch (err) {
      console.error('Error loading payment details:', err);
      setSelectedPayment(null);
    } finally {
      setLoadingPayment(false);
    }
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedPayment(null);
  };

  console.log('📊 WalletTransactions render - loading:', loading, 'hasInitialLoad:', hasInitialLoad);
  console.log('📊 Data counts - wallets:', allWallets.length, 'deposits:', allDeposits.length, 'withdrawals:', allWithdrawals.length);

  if (loading && !hasInitialLoad) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors">
        <AppLoading size="lg" text="Loading wallets..." />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full space-y-6 bg-gray-50 dark:bg-slate-950 min-h-screen transition-colors">
      {/* Header with Merchant Wallet Info */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-6 h-6 text-red-600 dark:text-red-400 transition-colors" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Wallet</h1>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 transition-colors">Merchant wallet and all wallets management</p>
            </div>
          </div>

          {/* Merchant Wallet Info */}
          {loadingWallet ? (
            <div className="text-center py-4">
              <AppLoading size="sm" text="Loading wallet info..." />
            </div>
          ) : activeMerchantWallet ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3 transition-colors" title="Current balance">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Balance</div>
                <div className="font-bold text-xl text-red-600 dark:text-red-400">
                  {formatThaiBaht(activeMerchantWallet.balance)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3 transition-colors" title="Available balance">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Available</div>
                <div className="font-bold text-xl text-green-600 dark:text-green-400">
                  {formatThaiBaht(activeMerchantWallet.available)}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3 transition-colors" title="Wallet status">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Status</div>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    activeMerchantWallet.status === 'ACTIVE'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                  }`}>
                    {activeMerchantWallet.status || '-'}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3 transition-colors" title="Wallet ID">
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Wallet ID</div>
                <div className="font-mono text-xs text-gray-900 dark:text-white truncate">
                  {activeMerchantWallet.walletId || '-'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-slate-500 text-sm">
              No active merchant wallet found
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-80">
        {/* Transaction Flow Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-5 rounded-lg transition-colors shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 transition-colors">
                <BarChart2 className="w-4 h-4 text-gray-600 dark:text-slate-400 transition-colors" />
                Transaction Flow
              </h3>
              {/* Member filter */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1 max-w-[150px]"
                  title="Filter by member"
                >
                  <option value="">All Members</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                  ))}
                </select>
                {/* Transaction type filter (shown only when member is selected) */}
                {selectedMemberId && (
                  <select
                    value={transactionTypeFilter}
                    onChange={(e) => setTransactionTypeFilter(e.target.value)}
                    className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1"
                    title="Transaction type"
                  >
                    <option value="all">All</option>
                    <option value="deposits">Deposits</option>
                    <option value="withdrawals">Withdrawals</option>
                  </select>
                )}
              </div>
              {/* Date range selector */}
              <div className="flex items-center gap-2">
                <select
                  value={walletFlowRange.preset}
                  onChange={(e) =>
                    setWalletFlowRange((prev) => ({
                      ...prev,
                      preset: e.target.value,
                    }))
                  }
                  className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1"
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="custom">Custom</option>
                </select>
                {walletFlowRange.preset === 'custom' && (
                  <div className="hidden md:flex items-center gap-2" ref={walletFlowDatePickerRef}>
                    {/* From Date */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setWalletFlowFromPickerOpen(!walletFlowFromPickerOpen);
                          setWalletFlowToPickerOpen(false);
                        }}
                        className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1 flex items-center gap-1 min-w-[100px]"
                      >
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="truncate">
                          {walletFlowRange.from || 'Start Date'}
                        </span>
                      </button>
                      {walletFlowFromPickerOpen && (
                        <div className="absolute z-50 mt-1 left-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3">
                          <DayPicker
                            mode="single"
                            locale={enUS}
                            selected={walletFlowRange.from ? new Date(walletFlowRange.from) : undefined}
                            onSelect={(date) => {
                              const from = date ? format(date, 'yyyy-MM-dd') : '';
                              setWalletFlowRange((prev) => ({ ...prev, from }));
                              setWalletFlowFromPickerOpen(false);
                            }}
                            disabled={(date) => {
                              const to = parseLocalDate(walletFlowRange.to);
                              if (to) return date > to;
                              return false;
                            }}
                            classNames={{
                              selected: 'bg-red-500 text-white',
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {/* To Date */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setWalletFlowToPickerOpen(!walletFlowToPickerOpen);
                          setWalletFlowFromPickerOpen(false);
                        }}
                        className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1 flex items-center gap-1 min-w-[100px]"
                      >
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="truncate">
                          {walletFlowRange.to || 'End Date'}
                        </span>
                      </button>
                      {walletFlowToPickerOpen && (
                        <div className="absolute z-50 mt-1 right-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3">
                          <DayPicker
                            mode="single"
                            locale={enUS}
                            selected={walletFlowRange.to ? new Date(walletFlowRange.to) : undefined}
                            onSelect={(date) => {
                              const to = date ? format(date, 'yyyy-MM-dd') : '';
                              setWalletFlowRange((prev) => ({ ...prev, to }));
                              setWalletFlowToPickerOpen(false);
                            }}
                            disabled={(date) => {
                              const from = parseLocalDate(walletFlowRange.from);
                              if (from) return date < from;
                              return false;
                            }}
                            classNames={{
                              selected: 'bg-red-500 text-white',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Zoom controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Zoom in"
                onClick={() => walletFlowChartRef.current?.zoomIn?.()}
                className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Zoom out"
                onClick={() => walletFlowChartRef.current?.zoomOut?.()}
                className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-gray-200 dark:bg-slate-800" />
              <button
                type="button"
                title="Reset zoom"
                onClick={() => walletFlowChartRef.current?.reset?.()}
                className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              title="Fullscreen"
              onClick={() => setWalletFlowFullscreen(true)}
              className="hidden sm:inline-flex p-2 rounded-full border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => walletFlowChartRef.current?.reset?.()}
              className="sm:hidden px-2 py-1 text-[11px] rounded border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              Reset
            </button>
          </div>
          <div className="h-64">
            <WalletFlowTVChart
              ref={walletFlowChartRef}
              deposits={filteredDepositsForChart}
              withdrawals={filteredWithdrawalsForChart}
              isLoading={loading}
              height={256}
              theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
              isFullscreen={false}
            />
          </div>
        </div>

        {/* Transaction Distribution */}
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-5 rounded-lg transition-colors shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4 transition-colors">Transaction Distribution</h3>
          <div className="h-48 flex items-center justify-center relative">
            <Doughnut
              data={distributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        return `${label}: ฿${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      },
                    },
                  },
                },
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-xs text-gray-600 dark:text-slate-400 transition-colors">Total</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white transition-colors">
                  {formatThaiBaht(totalDeposits + totalWithdrawals)}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 text-[10px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                <span className="text-gray-700 dark:text-slate-300 transition-colors">Deposits</span>
              </div>
              <span className="text-gray-600 dark:text-slate-400 transition-colors">{formatThaiBaht(totalDeposits)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
                <span className="text-gray-700 dark:text-slate-300 transition-colors">Withdrawals</span>
              </div>
              <span className="text-gray-600 dark:text-slate-400 transition-colors">{formatThaiBaht(totalWithdrawals)}</span>
            </div>
          </div>
        </div>
      </div>


      {/* Tabs: Wallet | Deposits | Withdrawals */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors">
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('wallets')}
            title="Customer wallets"
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'wallets'
                ? 'bg-red-600 text-white border-b-2 border-red-600'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Wallet
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            title="Deposit transactions"
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'deposits'
                ? 'bg-green-600 text-white border-b-2 border-green-600'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Deposits
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            title="Withdrawal transactions"
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'withdrawals'
                ? 'bg-orange-600 text-white border-b-2 border-orange-600'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Withdrawals
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors">
        <div 
          className="px-5 py-3 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/70"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            {showFilters ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            )}
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              Filters
            </h3>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="text-[10px] text-gray-600 dark:text-slate-400">
              {activeTab === 'wallets' && `Showing ${wallets.length} of ${pagination.total} wallets`}
              {activeTab === 'deposits' && `Showing ${deposits.length} of ${pagination.total} deposits`}
              {activeTab === 'withdrawals' && `Showing ${withdrawals.length} of ${pagination.total} withdrawals`}
              {hasActiveFilters() && ' (filtered)'}
            </div>
            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                title="Clear all filters"
                className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 border border-red-200 dark:border-red-500/50 rounded text-xs text-red-700 dark:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="p-5 space-y-4 border-t border-gray-100 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder={
                    activeTab === 'wallets' 
                      ? "Search (Wallet ID, Member ID, Name)..." 
                      : "Search (ID, Ref, Wallet ID)..."
                  }
                  title={
                    activeTab === 'wallets'
                      ? "Search by wallet ID, member ID, or member name"
                      : "Search by transaction ID, ref, or wallet ID"
                  }
                  className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                title="Filter by status"
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value="all">All Status</option>
                {activeTab === 'wallets' ? (
                  <>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </>
                ) : (
                  <>
                    <option value="SUCCESS">Success</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                  </>
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          {loading && !hasInitialLoad ? (
            <div className="py-12 text-center">
              <AppLoading size="md" text="Loading data..." />
            </div>
          ) : (
            activeTab === 'wallets' && wallets.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-slate-500 text-sm">
              No wallets found
            </div>
          ) : activeTab === 'deposits' && deposits.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-slate-500 text-sm">
              No deposits found
            </div>
          ) : activeTab === 'withdrawals' && withdrawals.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-slate-500 text-sm">
              No withdrawals found
            </div>
          ) : activeTab === 'wallets' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 transition-colors">
                <tr>
                  <th className="px-5 py-3 font-semibold">Wallet ID</th>
                  <th className="px-5 py-3 font-semibold">Member</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold text-right">Balance</th>
                  <th className="px-5 py-3 font-semibold text-right">Available</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-600 dark:text-slate-400 transition-colors">
                {wallets.map((wallet) => {
                  const isCustomer = wallet.walletType === 'CUSTOMER';
                  const isMerchant = wallet.walletType === 'MERCHANT';
                  const { date } = formatDate(wallet.createdAt);
                  
                  return (
                    <tr 
                      key={wallet.walletId}
                      onClick={() => handleWalletClick(wallet)}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-gray-900 dark:text-white">
                          {wallet.walletId || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {wallet.memberName || '-'}
                          </span>
                          <span className="font-mono text-[10px] text-gray-500 dark:text-slate-500">
                            {wallet.memberId || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          isCustomer
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : isMerchant
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                        }`}>
                          {isCustomer && <Users className="w-3 h-3" />}
                          {isMerchant && <Building2 className="w-3 h-3" />}
                          {wallet.walletType || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {formatThaiBaht(wallet.balance)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatThaiBaht(wallet.available)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          wallet.status === 'ACTIVE'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : wallet.status === 'INACTIVE'
                            ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {wallet.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700 dark:text-slate-300">{date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : activeTab === 'deposits' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 transition-colors">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Ref</th>
                  <th className="px-5 py-3 font-semibold">Wallet ID</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                  <th className="px-5 py-3 font-semibold text-right">Balance After</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-600 dark:text-slate-400 transition-colors">
                {deposits.map((deposit) => {
                  const { date, time } = formatDate(deposit.createdAt || deposit.timestamp);
                  
                  return (
                    <tr 
                      key={deposit.id} 
                      onClick={() => handleDepositClick(deposit)}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="text-gray-700 dark:text-slate-300">{date}</div>
                        <div className="font-mono text-[10px] text-gray-500 dark:text-slate-500">{time}</div>
                      </td>
                      <td className="px-5 py-3">
                        {deposit.ref ? (
                          <button
                            onClick={(e) => handlePaymentRefClick(deposit.ref, e)}
                            className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                            title="View payment details"
                          >
                            {deposit.ref}
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-gray-900 dark:text-white">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-gray-900 dark:text-white">
                          {deposit.walletId || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-semibold text-green-600 dark:text-green-400 text-xs">
                          +{formatThaiBaht(deposit.amount)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-gray-900 dark:text-white">
                          {deposit.bankCode || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          (deposit.status || '').toUpperCase() === 'SUCCESS' || (deposit.status || '').toUpperCase() === 'COMPLETED'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : (deposit.status || '').toUpperCase() === 'PENDING'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {deposit.status || 'UNKNOWN'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : activeTab === 'withdrawals' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 transition-colors">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Ref</th>
                  <th className="px-5 py-3 font-semibold">Wallet ID</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                  <th className="px-5 py-3 font-semibold">Bank</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-600 dark:text-slate-400 transition-colors">
                {withdrawals.map((withdrawal) => {
                  const { date, time } = formatDate(withdrawal.createdAt || withdrawal.timestamp);
                  
                  return (
                    <tr 
                      key={withdrawal.id}
                      onClick={() => handleWithdrawalClick(withdrawal)}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="text-gray-700 dark:text-slate-300">{date}</div>
                        <div className="font-mono text-[10px] text-gray-500 dark:text-slate-500">{time}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-gray-900 dark:text-white">
                          {withdrawal.ref || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-gray-900 dark:text-white">
                          {withdrawal.walletId || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-semibold text-red-600 dark:text-red-400 text-xs">
                          -{formatThaiBaht(withdrawal.amount)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs text-gray-900 dark:text-white">
                          {withdrawal.bankCode || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          (withdrawal.status || '').toUpperCase() === 'SUCCESS' || (withdrawal.status || '').toUpperCase() === 'COMPLETED'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : (withdrawal.status || '').toUpperCase() === 'PENDING'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {withdrawal.status || 'UNKNOWN'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null)}
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="px-4 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 flex items-center justify-between transition-colors">
            <div className="text-sm text-gray-600 dark:text-slate-400 transition-colors">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </div>
            {pagination.total > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  title="Previous page"
                  className="p-2 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700 dark:text-slate-300 px-3 transition-colors">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  title="Next page"
                  className="p-2 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Wallet Detail Modal with Transactions */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
              onClick={closeDetailModal}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-white dark:bg-slate-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-gray-200 dark:border-slate-700">
              {loadingDetail ? (
                <div className="p-8 text-center">
                  <AppLoading size="md" text="Loading wallet details..." />
                </div>
              ) : selectedWallet ? (
                <>
                  <div className="bg-white dark:bg-slate-900 px-6 pt-5 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Icon based on type */}
                        {selectedWallet.walletType ? (
                          <div className={`p-3 rounded-full ${
                            selectedWallet.walletType === 'CUSTOMER'
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : 'bg-orange-100 dark:bg-orange-900/30'
                          }`}>
                            {selectedWallet.walletType === 'CUSTOMER' ? (
                              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Building2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            )}
                          </div>
                        ) : activeTab === 'deposits' ? (
                          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                            <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedWallet.walletType 
                              ? (selectedWallet.memberName || 'Wallet Details')
                              : activeTab === 'deposits' 
                              ? 'Deposit Details'
                              : 'Withdrawal Details'}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                            {selectedWallet.walletType 
                              ? `${selectedWallet.walletType} Wallet`
                              : selectedWallet.ref || selectedWallet.id}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={closeDetailModal}
                        title="Close"
                        className="text-gray-400 hover:text-gray-500 dark:text-slate-500 dark:hover:text-slate-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Detail Info */}
                    {selectedWallet.walletType ? (
                      // Wallet Info
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                        <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Balance</div>
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                          {formatThaiBaht(selectedWallet.balance)}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                        <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Available</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {formatThaiBaht(selectedWallet.available)}
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                        <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Status</div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            selectedWallet.status === 'ACTIVE'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                          }`}>
                            {selectedWallet.status}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                        <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Currency</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedWallet.currency || 'THB'}
                        </div>
                      </div>
                    </div>
                    ) : selectedWallet._type === 'deposit' ? (
                      // Deposit Info with Bank Payment Detail
                      <div className="space-y-4 mb-4">
                        {/* Deposit Summary */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                            Deposit Information
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Amount</div>
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                +{formatThaiBaht(selectedWallet.amount)}
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Status</div>
                              <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  (selectedWallet.status || '').toUpperCase() === 'SUCCESS' || (selectedWallet.status || '').toUpperCase() === 'COMPLETED'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : (selectedWallet.status || '').toUpperCase() === 'PENDING'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                }`}>
                                  {selectedWallet.status || 'UNKNOWN'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Wallet ID</div>
                              <div className="font-mono text-xs text-gray-900 dark:text-white break-all">
                                {selectedWallet.walletId || '-'}
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Member ID</div>
                              <div className="font-mono text-xs text-gray-900 dark:text-white break-all">
                                {selectedWallet.memberId || '-'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bank Payment Detail */}
                        {selectedWallet.bankPaymentDetail && (
                          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              Bank Payment Detail
                            </h4>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Bank Name</div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {selectedWallet.bankPaymentDetail.bankName || '-'}
                                  </div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Bank Code</div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {selectedWallet.bankPaymentDetail.bankCode || '-'}
                                  </div>
                                </div>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Account Number</div>
                                <div className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                                  {selectedWallet.bankPaymentDetail.accountNo || '-'}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Transaction Number</div>
                                  <div className="text-xs font-mono text-gray-900 dark:text-white">
                                    {selectedWallet.bankPaymentDetail.txnNumber || '-'}
                                  </div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Payment Status</div>
                                  <div className="mt-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      (selectedWallet.bankPaymentDetail.status || '').toUpperCase() === 'SUCCESS' || (selectedWallet.bankPaymentDetail.status || '').toUpperCase() === 'COMPLETED'
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                        : (selectedWallet.bankPaymentDetail.status || '').toUpperCase() === 'PENDING'
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    }`}>
                                      {selectedWallet.bankPaymentDetail.status || 'UNKNOWN'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : selectedWallet._type === 'withdrawal' ? (
                      // Withdrawal Info with Fund Transfer Detail
                      <div className="space-y-4 mb-4">
                        {/* Withdrawal Summary */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                            Withdrawal Information
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Amount</div>
                              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                                -{formatThaiBaht(selectedWallet.amount)}
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Status</div>
                              <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  (selectedWallet.status || '').toUpperCase() === 'SUCCESS' || (selectedWallet.status || '').toUpperCase() === 'COMPLETED'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : (selectedWallet.status || '').toUpperCase() === 'PENDING'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                }`}>
                                  {selectedWallet.status || 'UNKNOWN'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Ref</div>
                              <div className="font-mono text-xs text-gray-900 dark:text-white">
                                {selectedWallet.ref || '-'}
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Bank Code</div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {selectedWallet.bankCode || '-'}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Wallet ID</div>
                              <div className="font-mono text-xs text-gray-900 dark:text-white break-all">
                                {selectedWallet.walletId || '-'}
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Member ID</div>
                              <div className="font-mono text-xs text-gray-900 dark:text-white break-all">
                                {selectedWallet.memberId || '-'}
                              </div>
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700 mt-3">
                            <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Created At</div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {(() => {
                                const { date, time } = formatDate(selectedWallet.createdAt);
                                return `${date} ${time}`;
                              })()}
                            </div>
                          </div>
                          {selectedWallet.failureReason && (
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-700 mt-3">
                              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Failure Reason</div>
                              <div className="text-sm text-red-700 dark:text-red-400">
                                {selectedWallet.failureReason}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Fund Transfer Detail */}
                        {selectedWallet.fundTransferDetail ? (
                          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                              Fund Transfer Detail
                            </h4>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Ref1</div>
                                  <div className="text-xs font-mono text-gray-900 dark:text-white">
                                    {selectedWallet.fundTransferDetail.ref1 || '-'}
                                  </div>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Transfer Status</div>
                                  <div className="mt-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      (selectedWallet.fundTransferDetail.transferStatus || '').toUpperCase() === 'SUCCESS' || (selectedWallet.fundTransferDetail.transferStatus || '').toUpperCase() === 'COMPLETED'
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                        : (selectedWallet.fundTransferDetail.transferStatus || '').toUpperCase() === 'PENDING'
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    }`}>
                                      {selectedWallet.fundTransferDetail.transferStatus || 'UNKNOWN'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                                <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Service Bank Name</div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {selectedWallet.fundTransferDetail.serviceBankName || '-'}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">From Account</div>
                                  <div className="text-xs font-mono text-gray-900 dark:text-white">
                                    {selectedWallet.fundTransferDetail.fromAccountNo || '-'}
                                  </div>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">To Account</div>
                                  <div className="text-xs font-mono text-gray-900 dark:text-white">
                                    {selectedWallet.fundTransferDetail.toAccountNo || '-'}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Response Code</div>
                                  <div className="text-xs font-mono text-gray-900 dark:text-white">
                                    {selectedWallet.fundTransferDetail.responseCode || '-'}
                                  </div>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">To Bank Code</div>
                                  <div className="text-xs font-semibold text-gray-900 dark:text-white">
                                    {selectedWallet.fundTransferDetail.toBankCode || '-'}
                                  </div>
                                </div>
                              </div>
                              {selectedWallet.fundTransferDetail.responseMsg && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                                  <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Response Message</div>
                                  <div className="text-sm text-gray-900 dark:text-white">
                                    {selectedWallet.fundTransferDetail.responseMsg}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700 text-center">
                              <div className="text-sm text-gray-500 dark:text-slate-400">
                                Fund transfer detail not available
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Transactions (only for wallet) */}
                    {selectedWallet.walletType && (
                      <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
                        Recent Transactions ({walletTransactions.length})
                      </h4>
                      
                      {walletTransactions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-slate-500 text-sm">
                          No transactions found for this wallet
                        </div>
                      ) : (
                        <div className="max-h-96 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 font-semibold">Date</th>
                                <th className="px-3 py-2 font-semibold">Ref</th>
                                <th className="px-3 py-2 font-semibold">Type</th>
                                <th className="px-3 py-2 font-semibold text-right">Amount</th>
                                <th className="px-3 py-2 font-semibold text-right">Bank</th>
                                <th className="px-3 py-2 font-semibold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {walletTransactions.map((txn, index) => {
                                const isDeposit = txn.type?.toLowerCase().includes('deposit');
                                const isWithdrawal = txn.type?.toLowerCase().includes('withdrawal');
                                const { date, time } = formatDate(txn.createdAt || txn.timestamp);
                                
                                return (
                                  <tr key={txn.id || index} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                                    <td className="px-3 py-2 text-gray-700 dark:text-slate-300 whitespace-nowrap">
                                      <div>{date}</div>
                                      <div className="font-mono text-[10px] text-gray-500 dark:text-slate-500">{time}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                      {isDeposit && txn.ref ? (
                                        <button
                                          onClick={(e) => handlePaymentRefClick(txn.ref, e)}
                                          className="font-mono text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                                          title="View payment details"
                                        >
                                          {txn.ref}
                                        </button>
                                      ) : (
                                        <span className="font-mono text-[10px] text-gray-900 dark:text-white">
                                          {txn.ref || '-'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                                        isDeposit
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                          : isWithdrawal
                                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                                      }`}>
                                        {isDeposit && <TrendingUp className="w-2.5 h-2.5" />}
                                        {isWithdrawal && <TrendingDown className="w-2.5 h-2.5" />}
                                        {txn.type || '-'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className={`font-semibold text-xs ${
                                        isDeposit
                                          ? 'text-green-600 dark:text-green-400'
                                          : isWithdrawal
                                          ? 'text-red-600 dark:text-red-400'
                                          : 'text-gray-900 dark:text-white'
                                      }`}>
                                        {isDeposit && '+'}
                                        {isWithdrawal && '-'}
                                        {formatThaiBaht(txn.amount)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="font-mono text-xs text-gray-500 dark:text-slate-400">
                                        {txn.bankCode || '-'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                        (txn.status || '').toUpperCase() === 'SUCCESS' || (txn.status || '').toUpperCase() === 'COMPLETED'
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                          : (txn.status || '').toUpperCase() === 'PENDING'
                                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                      }`}>
                                        {txn.status || 'UNKNOWN'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-3 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={closeDetailModal}
                      className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Payment Detail Modal (for deposit ref) */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
              onClick={closePaymentModal}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-white dark:bg-slate-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-gray-200 dark:border-slate-700">
              {loadingPayment ? (
                <div className="p-8 text-center">
                  <AppLoading size="md" text="Loading payment details..." />
                </div>
              ) : selectedPayment ? (
                <>
                  <div className="bg-white dark:bg-slate-900 px-6 pt-5 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                          <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Payment Details
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-mono">
                            {selectedPayment.id || selectedPayment.ref || '-'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={closePaymentModal}
                        title="Close"
                        className="text-gray-400 hover:text-gray-500 dark:text-slate-500 dark:hover:text-slate-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Amount</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatThaiBaht(selectedPayment.amount)}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Status</div>
                          <div className="mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              (selectedPayment.status || '').toUpperCase() === 'SUCCESS' || (selectedPayment.status || '').toUpperCase() === 'COMPLETED'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : (selectedPayment.status || '').toUpperCase() === 'PENDING'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {selectedPayment.status || 'UNKNOWN'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Bank Code</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {selectedPayment.bankCode || '-'}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Service Code</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {selectedPayment.serviceCode || '-'}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                        <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Account Name</div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedPayment.accountName || '-'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Account Number</div>
                          <div className="text-sm font-mono text-gray-900 dark:text-white">
                            {selectedPayment.accountNumber || '-'}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Member ID</div>
                          <div className="text-sm font-mono text-gray-900 dark:text-white break-all">
                            {selectedPayment.memberId || '-'}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                        <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Created At</div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {(() => {
                            const { date, time } = formatDate(selectedPayment.createdAt);
                            return `${date} ${time}`;
                          })()}
                        </div>
                      </div>

                      {selectedPayment.note && (
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                          <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">Note</div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {selectedPayment.note}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-3 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={closePaymentModal}
                      className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:w-auto transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-slate-500">
                  Payment not found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wallet Flow fullscreen overlay */}
      {walletFlowFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
          {/* click outside to close */}
          <button
            type="button"
            aria-label="Close fullscreen"
            onClick={() => setWalletFlowFullscreen(false)}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: 'default' }}
          />

          {/* Fullscreen content */}
          <div className="relative flex flex-col w-full h-full p-2 sm:p-4">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900/95 backdrop-blur-sm rounded-t-lg border border-slate-200 dark:border-slate-800 p-3 sm:p-4 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Title + Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="font-bold text-gray-900 dark:text-white text-sm">Transaction Flow</div>
                  {/* Member filter */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1 max-w-[150px]"
                      title="Filter by member"
                    >
                      <option value="">All Members</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name || m.id}</option>
                      ))}
                    </select>
                    {/* Transaction type filter */}
                    {selectedMemberId && (
                      <select
                        value={transactionTypeFilter}
                        onChange={(e) => setTransactionTypeFilter(e.target.value)}
                        className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1"
                        title="Transaction type"
                      >
                        <option value="all">All</option>
                        <option value="deposits">Deposits</option>
                        <option value="withdrawals">Withdrawals</option>
                      </select>
                    )}
                  </div>
                  {/* Date range selector */}
                  <div className="flex items-center gap-2">
                    <select
                      value={walletFlowRange.preset}
                      onChange={(e) =>
                        setWalletFlowRange((prev) => ({
                          ...prev,
                          preset: e.target.value,
                        }))
                      }
                      className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1"
                    >
                      <option value="today">Today</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="custom">Custom</option>
                    </select>
                    {walletFlowRange.preset === 'custom' && (
                      <div className="flex items-center gap-2" ref={walletFlowDatePickerRef}>
                        {/* From Date */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setWalletFlowFromPickerOpen(!walletFlowFromPickerOpen);
                              setWalletFlowToPickerOpen(false);
                            }}
                            className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1 flex items-center gap-1 min-w-[100px]"
                          >
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="truncate">
                              {walletFlowRange.from || 'Start'}
                            </span>
                          </button>
                          {walletFlowFromPickerOpen && (
                            <div className="absolute z-50 mt-1 left-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3">
                              <DayPicker
                                mode="single"
                                locale={enUS}
                                selected={walletFlowRange.from ? new Date(walletFlowRange.from) : undefined}
                                onSelect={(date) => {
                                  const from = date ? format(date, 'yyyy-MM-dd') : '';
                                  setWalletFlowRange((prev) => ({ ...prev, from }));
                                  setWalletFlowFromPickerOpen(false);
                                }}
                                disabled={(date) => {
                                  const to = parseLocalDate(walletFlowRange.to);
                                  if (to) return date > to;
                                  return false;
                                }}
                                classNames={{
                                  selected: 'bg-red-500 text-white',
                                }}
                              />
                            </div>
                          )}
                        </div>
                        {/* To Date */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setWalletFlowToPickerOpen(!walletFlowToPickerOpen);
                              setWalletFlowFromPickerOpen(false);
                            }}
                            className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1 flex items-center gap-1 min-w-[100px]"
                          >
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="truncate">
                              {walletFlowRange.to || 'End'}
                            </span>
                          </button>
                          {walletFlowToPickerOpen && (
                            <div className="absolute z-50 mt-1 right-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3">
                              <DayPicker
                                mode="single"
                                locale={enUS}
                                selected={walletFlowRange.to ? new Date(walletFlowRange.to) : undefined}
                                onSelect={(date) => {
                                  const to = date ? format(date, 'yyyy-MM-dd') : '';
                                  setWalletFlowRange((prev) => ({ ...prev, to }));
                                  setWalletFlowToPickerOpen(false);
                                }}
                                disabled={(date) => {
                                  const from = parseLocalDate(walletFlowRange.from);
                                  if (from) return date < from;
                                  return false;
                                }}
                                classNames={{
                                  selected: 'bg-red-500 text-white',
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-800/50 rounded-lg p-1">
                    <button
                      type="button"
                      title="Zoom in"
                      onClick={() => walletFlowChartRef.current?.zoomIn?.()}
                      className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Zoom out"
                      onClick={() => walletFlowChartRef.current?.zoomOut?.()}
                      className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-slate-800" />
                    <button
                      type="button"
                      title="Reset zoom"
                      onClick={() => walletFlowChartRef.current?.reset?.()}
                      className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    title="Exit fullscreen (Esc)"
                    onClick={() => setWalletFlowFullscreen(false)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-gray-800 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <Minimize2 className="w-4 h-4" />
                    <span className="text-xs font-semibold">Close</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 relative p-2 sm:p-4">
              <div className="w-full h-full bg-white dark:bg-slate-900/95 backdrop-blur-sm rounded-b-lg border border-t-0 border-slate-200 dark:border-slate-800 p-4">
                <WalletFlowTVChart
                  ref={walletFlowChartRef}
                  deposits={filteredDepositsForChart}
                  withdrawals={filteredWithdrawalsForChart}
                  isLoading={loading}
                  height={600}
                  theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                  isFullscreen={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletTransactions;
