import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeatures } from '../contexts/FeatureContext';
import { useTheme } from '../contexts/ThemeContext';
import { paymentRegistrationsAPI, transferConfigAPI, fundTransfersAPI, bankRegistrationsAPI, qrPaymentAPI } from '../services/api';
import zoomPlugin from 'chartjs-plugin-zoom';
import TransactionFlowTVChart from './TransactionFlowTVChart';
import AppLoading from './AppLoading';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-day-picker/style.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import {
  AlertTriangle,
  Activity,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Landmark,
  Filter,
  X,
  Search,
  Calendar,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import TreasuryMonitor from './TreasuryMonitor';
import QrPaymentDetailModal from './QrPaymentDetailModal';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

/** Parse YYYY-MM-DD as local midnight (avoids UTC timezone offset when comparing dates). */
function parseLocalDate(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Main Dashboard Component
 * Dashboard หลักที่แสดงภาพรวมของระบบ
 */
const Dashboard = () => {
  // Transaction Flow chart auto-sizes to its container (width + height)
  const navigate = useNavigate();
  const { features } = useFeatures();
  const { theme } = useTheme();
  const [payments, setPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]); // Store all payments for filtering
  const [paymentStats, setPaymentStats] = useState(null); // Stats from API
  const [hasPaymentsInitialLoad, setHasPaymentsInitialLoad] = useState(false);
  const [bankInfo, setBankInfo] = useState({ bankSummaries: [], totals: {} });
  const [bankList, setBankList] = useState([]); // Bank list from API
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false); // Separate loading state for table switching
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [activeTab, setActiveTab] = useState('payments'); // 'payments', 'fund-transfers', 'bank-registrations', or 'qr-payments'
  const [dateFromPickerOpen, setDateFromPickerOpen] = useState(false);
  const [dateToPickerOpen, setDateToPickerOpen] = useState(false);
  const datePickerRef = useRef(null);
  const [transactionFlowFromPickerOpen, setTransactionFlowFromPickerOpen] = useState(false);
  const [transactionFlowToPickerOpen, setTransactionFlowToPickerOpen] = useState(false);
  const transactionFlowDatePickerRef = useRef(null);
  
  // Fund Transfers states
  const [fundTransfers, setFundTransfers] = useState([]);
  const [allFundTransfers, setAllFundTransfers] = useState([]);
  const [fundTransferStats, setFundTransferStats] = useState(null); // Stats from API
  const [hasFundTransfersInitialLoad, setHasFundTransfersInitialLoad] = useState(false);
  const [fundTransferPagination, setFundTransferPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [fundTransferFilters, setFundTransferFilters] = useState({
    search: '',
    status: 'all',
    bank: 'all',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
  });
  
  // Bank Registrations states
  const [bankRegistrations, setBankRegistrations] = useState([]);
  const [allBankRegistrations, setAllBankRegistrations] = useState([]);
  const [bankRegistrationStats, setBankRegistrationStats] = useState(null); // Stats from API
  const [hasBankRegistrationsInitialLoad, setHasBankRegistrationsInitialLoad] = useState(false);
  const [bankRegistrationPagination, setBankRegistrationPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [bankRegistrationFilters, setBankRegistrationFilters] = useState({
    search: '',
    status: 'all',
    bank: 'all',
    dateFrom: '',
    dateTo: '',
  });
  
  // QR Payments states
  const [qrPayments, setQrPayments] = useState([]);
  const [allQrPayments, setAllQrPayments] = useState([]);
  const [qrPaymentPagination, setQrPaymentPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [qrPaymentFilters, setQrPaymentFilters] = useState({
    search: '',
    status: 'all',
    bank: 'all',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    bank: 'all',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Track if component has mounted (initial load)
  const [hasMounted, setHasMounted] = useState(false);

  // Transaction Flow should not follow table pagination. Load a separate dataset for the chart.
  const [transactionFlowSource, setTransactionFlowSource] = useState([]);
  const [transactionFlowLoading, setTransactionFlowLoading] = useState(false);
  const transactionFlowRequestIdRef = useRef(0);
  const transactionFlowChartRef = useRef(null);
  const [transactionFlowFullscreen, setTransactionFlowFullscreen] = useState(false);
  const [transactionFlowRange, setTransactionFlowRange] = useState({
    preset: 'today', // 'today' | '7d' | '30d' | 'custom'
    from: '',
    to: '',
  });

  const TransactionFlowLoadingBadge = () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <AppLoading size="md" text="Loading chart…" />
    </div>
  );

  // ESC to close fullscreen chart
  useEffect(() => {
    if (!transactionFlowFullscreen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setTransactionFlowFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [transactionFlowFullscreen]);
  
  // Selected QR Payment ID for detail modal
  const [selectedQrPaymentId, setSelectedQrPaymentId] = useState(null);
  
  // Load initial data on mount - load all data
  useEffect(() => {
    if (!hasMounted) {
      setHasMounted(true);
      loadDashboardData(); // Always load all data
      loadBankList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load payment and fund transfer stats for Net Total Payments KPI (always, regardless of tab)
  useEffect(() => {
    const loadStatsForNetKPI = async () => {
      try {
        // Load payment stats if not already loaded
        if (!paymentStats) {
          try {
            const pStats = await paymentRegistrationsAPI.getStats();
            setPaymentStats(pStats);
          } catch (err) {
            console.warn('⚠️ Payment stats not available for Net KPI:', err?.message || err);
          }
        }
        // Load fund transfer stats if not already loaded
        if (!fundTransferStats) {
          try {
            const ftStats = await fundTransfersAPI.getStats();
            setFundTransferStats(ftStats);
          } catch (err) {
            console.warn('⚠️ Fund Transfer stats not available for Net KPI:', err?.message || err);
          }
        }
      } catch (err) {
        console.error('Error loading stats for Net KPI:', err);
      }
    };
    
    loadStatsForNetKPI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle click outside date pickers to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setDateFromPickerOpen(false);
        setDateToPickerOpen(false);
      }
      if (transactionFlowDatePickerRef.current && !transactionFlowDatePickerRef.current.contains(event.target)) {
        setTransactionFlowFromPickerOpen(false);
        setTransactionFlowToPickerOpen(false);
      }
    };

    if (dateFromPickerOpen || dateToPickerOpen || transactionFlowFromPickerOpen || transactionFlowToPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dateFromPickerOpen, dateToPickerOpen, transactionFlowFromPickerOpen, transactionFlowToPickerOpen]);

  // Load bank list from API
  const loadBankList = async () => {
    try {
      const banks = await transferConfigAPI.getBankList();
      setBankList(banks);
    } catch (err) {
      console.error('Error loading bank list:', err);
      setBankList([]);
    }
  };

  // Note: Pagination changes don't trigger API reload anymore
  // We load all data once and use client-side pagination

  // Load Transaction Flow dataset (all pages) for the chart.
  // For payments/fund-transfers we combine both into one chart dataset (tagged with flowType),
  // so the user can compare them together on the same timeline.
  const loadTransactionFlowData = async () => {
    if (activeTab === 'bank-registrations') return;

    const requestId = ++transactionFlowRequestIdRef.current;
    setTransactionFlowLoading(true);

    try {
      const limit = 200;
      const maxPages = 50; // safety cap (200 * 50 = 10,000 rows)
      let page = 1;
      let total = 0;
      let totalPages = 1;
      const collected = [];

      // Build chart date range (override only for chart)
      const toYmd = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      const getChartDateRange = () => {
        const now = new Date();
        if (transactionFlowRange.preset === 'today') {
          const ymd = toYmd(now);
          return { dateFrom: ymd, dateTo: ymd };
        }
        if (transactionFlowRange.preset === '7d') {
          const start = new Date(now);
          start.setDate(now.getDate() - 6);
          return { dateFrom: toYmd(start), dateTo: toYmd(now) };
        }
        if (transactionFlowRange.preset === '30d') {
          const start = new Date(now);
          start.setDate(now.getDate() - 29);
          return { dateFrom: toYmd(start), dateTo: toYmd(now) };
        }
        // custom
        return {
          dateFrom: transactionFlowRange.from || '',
          dateTo: transactionFlowRange.to || '',
        };
      };

      const chartRange = getChartDateRange();

      const buildPaymentsFilters = () => ({
        bankCode: filters.bank,
        status: filters.status,
        search: filters.search,
        dateFrom: chartRange.dateFrom || filters.dateFrom,
        dateTo: chartRange.dateTo || filters.dateTo,
        amountMin: filters.amountMin,
        amountMax: filters.amountMax,
      });

      const buildFundTransfersFilters = () => ({
        bankCode: fundTransferFilters.bank,
        status: fundTransferFilters.status,
        search: fundTransferFilters.search,
        dateFrom: chartRange.dateFrom || fundTransferFilters.dateFrom,
        dateTo: chartRange.dateTo || fundTransferFilters.dateTo,
        amountMin: fundTransferFilters.amountMin,
        amountMax: fundTransferFilters.amountMax,
      });

      const fetchAllPages = async ({ type, fetchPage }) => {
        let localPage = 1;
        let localTotal = 0;
        let localTotalPages = 1;
        const localCollected = [];

        while (localPage <= localTotalPages && localPage <= maxPages) {
          const resp = await fetchPage(localPage);

          // If a newer request started, stop updating state.
          if (transactionFlowRequestIdRef.current !== requestId) return [];

          const rows = Array.isArray(resp?.data)
            ? resp.data
            : Array.isArray(resp)
              ? resp
              : [];

          rows.forEach((r) => {
            localCollected.push({
              flowType: type, // 'payments' | 'fund-transfers' | 'qr-payments'
              createdAt: r?.createdAt,
              amount: r?.amount ?? r?.amountInBaht ?? 0,
              status: r?.status,
              transferStatus: r?.transferStatus,
              inquiryStatus: r?.inquiryStatus,
              // identifiers / "who" for chart tooltip
              ref: r?.ref,
              ref1: r?.ref1,
              ref2: r?.ref2,
              internalRef: r?.internalRef,
              rsTransID: r?.rsTransID,
              transactionId: r?.transactionId,
              id: r?.id,
              member: r?.member ? { name: r.member.name, citizenId: r.member.citizenId } : null,
            });
          });

          localTotal = typeof resp?.total === 'number' ? resp.total : localTotal;
          localTotalPages = localTotal
            ? Math.ceil(localTotal / limit)
            : (typeof resp?.totalPages === 'number' ? resp.totalPages : localTotalPages);

          if (localPage === 1) {
            console.log(`📈 Transaction Flow ${type} page 1:`, rows.length, 'total:', localTotal, 'totalPages:', localTotalPages);
          }
          localPage += 1;
        }

        if (localPage > maxPages) {
          console.warn(`⚠️ Transaction Flow ${type} capped at max pages:`, maxPages, 'Total:', localTotal);
        }

        return localCollected;
      };

      if (activeTab === 'payments' || activeTab === 'fund-transfers') {
        const paymentsFilters = buildPaymentsFilters();
        const transfersFilters = buildFundTransfersFilters();
        console.log('📈 Transaction Flow range:', chartRange, 'paymentsFilters:', paymentsFilters, 'transfersFilters:', transfersFilters);

        const [paymentsRows, transferRows] = await Promise.all([
          fetchAllPages({
            type: 'payments',
            fetchPage: (p) => paymentRegistrationsAPI.getAll(p, limit, paymentsFilters),
          }),
          fetchAllPages({
            type: 'fund-transfers',
            fetchPage: (p) => fundTransfersAPI.getAll(p, limit, transfersFilters),
          }),
        ]);
        collected.push(...paymentsRows, ...transferRows);
      } else {
        // qr-payments (not combining today)
        console.log('📈 Transaction Flow range:', chartRange, 'tab:', activeTab);
        const rows = await fetchAllPages({
          type: 'qr-payments',
          fetchPage: (p) => qrPaymentAPI.getAll(p, limit),
        });
        collected.push(...rows);
      }

      // Ensure date range always works even if the backend ignores dateFrom/dateTo:
      // apply date filtering client-side using createdAt (inclusive range).
      let filtered = collected;
      if (chartRange.dateFrom || chartRange.dateTo) {
        const startMs = chartRange.dateFrom
          ? new Date(`${chartRange.dateFrom}T00:00:00`).getTime()
          : null;
        const endMs = chartRange.dateTo
          ? new Date(`${chartRange.dateTo}T23:59:59.999`).getTime()
          : null;
        filtered = collected.filter((r) => {
          const t = r?.createdAt ? new Date(r.createdAt).getTime() : NaN;
          if (!Number.isFinite(t)) return false;
          if (startMs !== null && t < startMs) return false;
          if (endMs !== null && t > endMs) return false;
          return true;
        });
        console.log('📈 Transaction Flow after client date filter:', filtered.length, 'rows');
      }

      setTransactionFlowSource(filtered);
    } catch (err) {
      console.error('Error loading Transaction Flow data:', err);
      // Keep previous chart data for a smoother UX; just stop the loading state.
    } finally {
      if (transactionFlowRequestIdRef.current === requestId) {
        setTransactionFlowLoading(false);
      }
    }
  };
  
  // Load fund transfers when switching to fund-transfers tab (only if not loaded)
  useEffect(() => {
    if (activeTab === 'fund-transfers' && allFundTransfers.length === 0) {
      loadFundTransfersData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Keep Transaction Flow in sync with active tab + filters (not pagination).
  useEffect(() => {
    loadTransactionFlowData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    transactionFlowRange.preset,
    transactionFlowRange.from,
    transactionFlowRange.to,
    // payments filters
    filters.bank,
    filters.status,
    filters.search,
    filters.dateFrom,
    filters.dateTo,
    filters.amountMin,
    filters.amountMax,
    // fund transfers filters
    fundTransferFilters.bank,
    fundTransferFilters.status,
    fundTransferFilters.search,
    fundTransferFilters.dateFrom,
    fundTransferFilters.dateTo,
    fundTransferFilters.amountMin,
    fundTransferFilters.amountMax,
  ]);
  
  // Fund Transfers: reset to page 1 when filters change (client-side filtering)
  useEffect(() => {
    if (activeTab === 'fund-transfers') {
      setFundTransferPagination(prev => ({ ...prev, page: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fundTransferFilters.bank,
    fundTransferFilters.status,
    fundTransferFilters.search,
    fundTransferFilters.dateFrom,
    fundTransferFilters.dateTo,
    fundTransferFilters.amountMin,
    fundTransferFilters.amountMax,
  ]);
  
  // Reload when payments pagination changes — skip (client-side pagination)
  useEffect(() => {
    if (activeTab === 'payments') return;
    if (hasPaymentsInitialLoad) loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);
  
  // Payments: reset to page 1 when filters change (client-side filtering)
  useEffect(() => {
    if (activeTab === 'payments') {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.bank,
    filters.status,
    filters.search,
    filters.dateFrom,
    filters.dateTo,
    filters.amountMin,
    filters.amountMax,
  ]);

  // Payments: client-side filter + paginate
  useEffect(() => {
    if (activeTab !== 'payments' || !Array.isArray(allPayments)) {
      return;
    }
    const limit = pagination.limit;
    const page = pagination.page;

    const filtered = allPayments.filter((p) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const match =
          (p.ref || '').toLowerCase().includes(s) ||
          (p.ref1 || '').toLowerCase().includes(s) ||
          (p.txnNumber || '').toLowerCase().includes(s) ||
          (p.member?.name || '').toLowerCase().includes(s) ||
          (p.member?.citizenId || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (filters.status !== 'all') {
        const st = (p.status || '').toUpperCase();
        if (st !== filters.status) return false;
      }
      if (filters.bank !== 'all') {
        if ((p.bankCode || '') !== filters.bank) return false;
      }
      if (filters.dateFrom || filters.dateTo) {
        const d = new Date(p.createdAt);
        if (filters.dateFrom) {
          const [y, m, day] = filters.dateFrom.split('-').map(Number);
          const from = new Date(y, m - 1, day);
          from.setHours(0, 0, 0, 0);
          if (d < from) return false;
        }
        if (filters.dateTo) {
          const [y, m, day] = filters.dateTo.split('-').map(Number);
          const to = new Date(y, m - 1, day);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
      }
      const amount = parseFloat(p.amount) || 0;
      if (filters.amountMin && amount < Number(filters.amountMin)) return false;
      if (filters.amountMax && amount > Number(filters.amountMax)) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const slice = sorted.slice(start, start + limit);

    setPayments(slice);
    const safePage = Math.max(1, Math.min(pagination.page, totalPages));
    setPagination(prev => ({ ...prev, total, totalPages, page: safePage }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    allPayments,
    filters.bank,
    filters.status,
    filters.search,
    filters.dateFrom,
    filters.dateTo,
    filters.amountMin,
    filters.amountMax,
    pagination.page,
    pagination.limit,
  ]);

  // Fund Transfers: client-side filter + paginate
  useEffect(() => {
    if (activeTab !== 'fund-transfers' || !Array.isArray(allFundTransfers)) return;
    const limit = fundTransferPagination.limit;
    const page = fundTransferPagination.page;
    const f = fundTransferFilters;

    const filtered = allFundTransfers.filter((t) => {
      if (f.search) {
        const s = f.search.toLowerCase();
        const match =
          (t.ref1 || '').toLowerCase().includes(s) ||
          (t.rsTransID || '').toLowerCase().includes(s) ||
          (t.member?.name || '').toLowerCase().includes(s) ||
          (t.member?.citizenId || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (f.status !== 'all') {
        const st = (t.transferStatus || t.inquiryStatus || '').toUpperCase();
        if (st !== f.status) return false;
      }
      if (f.bank !== 'all') {
        if ((t.serviceBankCode || '') !== f.bank) return false;
      }
      const d = new Date(t.createdAt || t.requestDateTime);
      if (f.dateFrom) {
        const [y, m, day] = f.dateFrom.split('-').map(Number);
        const from = new Date(y, m - 1, day);
        from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (f.dateTo) {
        const [y, m, day] = f.dateTo.split('-').map(Number);
        const to = new Date(y, m - 1, day);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      const amount = parseFloat(t.amount) || 0;
      if (f.amountMin && amount < Number(f.amountMin)) return false;
      if (f.amountMax && amount > Number(f.amountMax)) return false;
      return true;
    });

    const getDate = (t) => new Date(t.createdAt || t.requestDateTime || 0);
    const sorted = [...filtered].sort((a, b) => getDate(b) - getDate(a));
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * limit;
    const slice = sorted.slice(start, start + limit);

    setFundTransfers(slice);
    setFundTransferPagination(prev => ({ ...prev, total, totalPages, page: safePage }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    allFundTransfers,
    fundTransferFilters.bank,
    fundTransferFilters.status,
    fundTransferFilters.search,
    fundTransferFilters.dateFrom,
    fundTransferFilters.dateTo,
    fundTransferFilters.amountMin,
    fundTransferFilters.amountMax,
    fundTransferPagination.page,
    fundTransferPagination.limit,
  ]);

  // Bank Registrations: client-side filter + paginate
  useEffect(() => {
    if (activeTab !== 'bank-registrations' || !Array.isArray(allBankRegistrations)) return;
    const limit = bankRegistrationPagination.limit;
    const page = bankRegistrationPagination.page;
    const f = bankRegistrationFilters;

    const filtered = allBankRegistrations.filter((r) => {
      if (f.search) {
        const s = f.search.toLowerCase();
        const match =
          (r.regRef || '').toLowerCase().includes(s) ||
          (r.member?.name || '').toLowerCase().includes(s) ||
          (r.member?.citizenId || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (f.status !== 'all') {
        const st = (r.status || '').toUpperCase();
        if (st !== f.status) return false;
      }
      if (f.bank !== 'all') {
        if ((r.bankCode || '') !== f.bank) return false;
      }
      const d = new Date(r.createdAt);
      if (f.dateFrom) {
        const [y, m, day] = f.dateFrom.split('-').map(Number);
        const from = new Date(y, m - 1, day);
        from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (f.dateTo) {
        const [y, m, day] = f.dateTo.split('-').map(Number);
        const to = new Date(y, m - 1, day);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * limit;
    const slice = sorted.slice(start, start + limit);

    setBankRegistrations(slice);
    setBankRegistrationPagination(prev => ({ ...prev, total, totalPages, page: safePage }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    allBankRegistrations,
    bankRegistrationFilters.bank,
    bankRegistrationFilters.status,
    bankRegistrationFilters.search,
    bankRegistrationFilters.dateFrom,
    bankRegistrationFilters.dateTo,
    bankRegistrationPagination.page,
    bankRegistrationPagination.limit,
  ]);
  
  // Load bank registrations when switching to bank-registrations tab (only if not loaded)
  useEffect(() => {
    if (activeTab === 'bank-registrations' && allBankRegistrations.length === 0) {
      loadBankRegistrationsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Bank Registrations: reset to page 1 when filters change (client-side filtering)
  useEffect(() => {
    if (activeTab === 'bank-registrations') {
      setBankRegistrationPagination(prev => ({ ...prev, page: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bankRegistrationFilters.bank,
    bankRegistrationFilters.status,
    bankRegistrationFilters.search,
    bankRegistrationFilters.dateFrom,
    bankRegistrationFilters.dateTo,
  ]);
  
  // Load QR payments when switching to qr-payments tab (only if not loaded)
  useEffect(() => {
    if (activeTab === 'qr-payments' && allQrPayments.length === 0) {
      loadQrPaymentsData(); // Always load all data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadFundTransfersData = async () => {
    try {
      setTableLoading(true);

      try {
        const statsResponse = await fundTransfersAPI.getStats();
        setFundTransferStats(statsResponse);
        console.log('✅ Fund Transfers stats loaded from API');
      } catch (statsError) {
        console.warn('⚠️ Fund Transfers stats API not available:', statsError?.message || statsError);
      }

      // Load all for client-side filter + paginate (backend may not support filters)
      const dataResponse = await fundTransfersAPI.getAll(1, 5000, {});
      const fundTransfersArray = Array.isArray(dataResponse?.data)
        ? dataResponse.data
        : Array.isArray(dataResponse)
          ? dataResponse
          : [];

      console.log('📄 Fund Transfers loaded:', fundTransfersArray.length, 'records (client-side filter + paginate)');
      setAllFundTransfers(fundTransfersArray);
      // fundTransfers + pagination set by filter useEffect
    } catch (err) {
      console.error('Error loading fund transfers data:', err);
      setAllFundTransfers([]);
      setFundTransfers([]);
    } finally {
      setTableLoading(false);
      setHasFundTransfersInitialLoad(true);
    }
  };
  
  const loadBankRegistrationsData = async () => {
    try {
      setTableLoading(true);

      const [statsResponse, dataResponse] = await Promise.all([
        bankRegistrationsAPI.getStats(),
        bankRegistrationsAPI.getAll(1, 5000, {}),
      ]);

      setBankRegistrationStats(statsResponse);
      const bankRegistrationsArray = Array.isArray(dataResponse?.data)
        ? dataResponse.data
        : Array.isArray(dataResponse)
          ? dataResponse
          : [];

      console.log('📊 Bank Registrations loaded:', bankRegistrationsArray.length, 'records (client-side filter + paginate)');
      setAllBankRegistrations(bankRegistrationsArray);
      // bankRegistrations + pagination set by filter useEffect
    } catch (err) {
      console.error('Error loading bank registrations data:', err);
      setAllBankRegistrations([]);
      setBankRegistrations([]);
    } finally {
      setTableLoading(false);
      setHasBankRegistrationsInitialLoad(true);
    }
  };
  
  const loadQrPaymentsData = async () => {
    try {
      // Use table loading instead of global loading to avoid reloading entire page
      if (allQrPayments.length === 0) {
        setTableLoading(true);
      }
      
      // Load ALL data for client-side pagination/filtering (no limit)
      // Backend must support ?all=true parameter
      const response = await qrPaymentAPI.getAll(1, 10, true);

      const qrPaymentsArray = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      setAllQrPayments(qrPaymentsArray);
      // Don't set qrPayments here - it will be set by the filter useEffect

      // Note: totalPages will be calculated based on filtered data
    } catch (err) {
      console.error('Error loading QR payments data:', err);
      // Don't crash the app
      if (allQrPayments.length === 0) {
        setAllQrPayments([]);
        setQrPayments([]);
      }
    } finally {
      setTableLoading(false);
    }
  };

  // Note: No need to reload when bank filter changes - we already have all data

  // Note: Payments now use server-side filtering and pagination
  // No client-side filtering needed

  // Note: Fund Transfers now use server-side filtering and pagination
  // No client-side filtering needed
  
  // Note: Bank Registrations now use server-side filtering and pagination
  // No client-side filtering needed
  
  // Store filtered QR payments (without pagination)
  const [filteredQrPayments, setFilteredQrPayments] = useState([]);

  // Filter QR payments (apply filters, no pagination yet)
  useEffect(() => {
    if (activeTab !== 'qr-payments' || !Array.isArray(allQrPayments)) {
      setFilteredQrPayments([]);
      return;
    }
    
    const filtered = allQrPayments.filter((qrPayment) => {
      // Search filter
      if (qrPaymentFilters.search) {
        const searchLower = qrPaymentFilters.search.toLowerCase();
        const matchesSearch =
          qrPayment.ref1?.toLowerCase().includes(searchLower) ||
          qrPayment.ref2?.toLowerCase().includes(searchLower) ||
          qrPayment.internalRef?.toLowerCase().includes(searchLower) ||
          qrPayment.serviceCode?.toLowerCase().includes(searchLower) ||
          qrPayment.id?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (qrPaymentFilters.status !== 'all') {
        const status = qrPayment.status || '';
        if (status?.toLowerCase() !== qrPaymentFilters.status.toLowerCase()) return false;
      }

      // Bank filter - match by bankCode (from dropdown)
      if (qrPaymentFilters.bank !== 'all') {
        const qrPaymentBankCode = String(qrPayment.bankCode || '').trim();
        const filterBankCode = String(qrPaymentFilters.bank || '').trim();
        if (qrPaymentBankCode !== filterBankCode) {
          return false;
        }
      }

      // Date range filter
      if (qrPaymentFilters.dateFrom || qrPaymentFilters.dateTo) {
        const qrPaymentDate = new Date(qrPayment.createdAt);
        if (qrPaymentFilters.dateFrom) {
          const fromDate = new Date(qrPaymentFilters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (qrPaymentDate < fromDate) return false;
        }
        if (qrPaymentFilters.dateTo) {
          const toDate = new Date(qrPaymentFilters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (qrPaymentDate > toDate) return false;
        }
      }

      // Amount range filter
      if (qrPaymentFilters.amountMin || qrPaymentFilters.amountMax) {
        const amount = Number(qrPayment.amountInBaht) || 0;
        if (qrPaymentFilters.amountMin && amount < Number(qrPaymentFilters.amountMin)) return false;
        if (qrPaymentFilters.amountMax && amount > Number(qrPaymentFilters.amountMax)) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setFilteredQrPayments(sorted);

    // Reset pagination to page 1 when filters change
    setQrPaymentPagination(prev => ({
      ...prev,
      page: 1,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.limit),
    }));
  }, [qrPaymentFilters, allQrPayments, activeTab]);
  
  // Apply pagination to filtered QR payments
  useEffect(() => {
    if (activeTab !== 'qr-payments') return;

    const filteredTotal = filteredQrPayments.length;
    const totalPages = Math.ceil(filteredTotal / qrPaymentPagination.limit) || 1;
    
    // Reset to page 1 if current page exceeds total pages
    let currentPage = qrPaymentPagination.page;
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = 1;
    }

    // Always update pagination total to match filtered data
    setQrPaymentPagination(prev => ({
      ...prev,
      page: currentPage > totalPages && totalPages > 0 ? 1 : prev.page,
      total: filteredTotal,
      totalPages: totalPages,
    }));

    // Apply pagination
    const pageToUse = currentPage > totalPages && totalPages > 0 ? 1 : currentPage;
    const start = (pageToUse - 1) * qrPaymentPagination.limit;
    const end = start + qrPaymentPagination.limit;
    const paginated = filteredQrPayments.slice(start, end);

    setQrPayments(paginated);
  }, [filteredQrPayments, qrPaymentPagination.page, qrPaymentPagination.limit, activeTab]);

  // Get unique banks for filter dropdown - use bank list from API
  // Format: "bankNameThai (bankCode)" or "bankNameEng (bankCode)"
  const getBankDisplayName = (bank) => {
    if (!bank) return '';
    if (bank.bankNameThai && bank.bankCode) {
      return `${bank.bankNameThai} (${bank.bankCode})`;
    }
    if (bank.bankNameEng && bank.bankCode) {
      return `${bank.bankNameEng} (${bank.bankCode})`;
    }
    return bank.bankName || bank.bankCode || '';
  };

  // Use bank list from API - show all banks for filtering (not just active ones)
  const availableBanks = bankList
    .map((bank) => ({
      displayName: getBankDisplayName(bank),
      bankCode: bank.bankCode,
      bankNameThai: bank.bankNameThai,
      bankNameEng: bank.bankNameEng,
    }))
    .sort((a, b) => (a.bankNameThai || a.bankNameEng || '').localeCompare(b.bankNameThai || b.bankNameEng || ''));

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      bank: 'all',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
    });
  };

  const hasActiveFilters = () => {
    let currentFilters;
    if (activeTab === 'payments') {
      currentFilters = filters;
    } else if (activeTab === 'fund-transfers') {
      currentFilters = fundTransferFilters;
    } else if (activeTab === 'qr-payments') {
      currentFilters = qrPaymentFilters;
    } else {
      currentFilters = bankRegistrationFilters;
    }
    
    return (
      currentFilters.search ||
      currentFilters.status !== 'all' ||
      currentFilters.bank !== 'all' ||
      currentFilters.dateFrom ||
      currentFilters.dateTo ||
      (currentFilters.amountMin !== undefined && currentFilters.amountMin) ||
      (currentFilters.amountMax !== undefined && currentFilters.amountMax)
    );
  };

  const clearFundTransferFilters = () => {
    setFundTransferFilters({
      search: '',
      status: 'all',
      bank: 'all',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
    });
  };
  
  const clearBankRegistrationFilters = () => {
    setBankRegistrationFilters({
      search: '',
      status: 'all',
      bank: 'all',
      dateFrom: '',
      dateTo: '',
    });
  };
  
  const clearQrPaymentFilters = () => {
    setQrPaymentFilters({
      search: '',
      status: 'all',
      bank: 'all',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
    });
  };

  const loadDashboardData = async () => {
    try {
      setTableLoading(true);
      
      // Load all payments (no filters) for client-side filtering — backend may not support filter params
      const paymentFilters = {};
      
      // Try to load stats from API, fallback to all data if not available
      let statsResponse = null;
      let allDataForMetrics = [];
      
      try {
        statsResponse = await paymentRegistrationsAPI.getStats();
        setPaymentStats(statsResponse);
        console.log('✅ Payments stats loaded from API');
      } catch (statsError) {
        console.warn('⚠️ Payments stats API not available, loading all data for metrics:', statsError.message);
        // If stats API fails, load all data for metrics calculation
        try {
          const allDataResponse = await paymentRegistrationsAPI.getAll(1, 10000, {});
          allDataForMetrics = Array.isArray(allDataResponse?.data) 
            ? allDataResponse.data 
            : Array.isArray(allDataResponse) 
              ? allDataResponse 
              : [];
          console.log('📊 Loaded', allDataForMetrics.length, 'payments for metrics calculation');
        } catch (allDataError) {
          console.error('❌ Failed to load all payments data:', allDataError);
        }
      }

      // Also try to load Fund Transfers stats for net "Total Payments" KPI (Payments - Fund Transfers)
      // Best-effort only; dashboard should still work even if this endpoint fails.
      try {
        const ftStats = await fundTransfersAPI.getStats();
        setFundTransferStats(ftStats);
      } catch (ftStatsError) {
        // Don't overwrite existing stats if they were loaded elsewhere
        console.warn('⚠️ Fund Transfers stats not available for net KPI:', ftStatsError?.message || ftStatsError);
      }
      
      // Load all payments (large limit) and bank info — we filter + paginate client-side
      const [paymentsResponse, bankInfoData] = await Promise.all([
        paymentRegistrationsAPI.getAll(1, 5000, paymentFilters),
        transferConfigAPI.getBankInfo(),
      ]);

      const paymentsArray = Array.isArray(paymentsResponse?.data) 
        ? paymentsResponse.data 
        : Array.isArray(paymentsResponse) 
          ? paymentsResponse 
          : [];
      
      console.log('📄 Payments loaded:', paymentsArray.length, 'records (client-side filter + paginate)');
      
      const bankSummaries = bankInfoData?.bankSummaries || [];
      const totals = bankInfoData?.totals || {};

      if (allDataForMetrics.length > 0) {
        setAllPayments(allDataForMetrics);
      } else {
        setAllPayments(paymentsArray);
      }
      setBankInfo({ bankSummaries, totals });
      // payments + pagination set by filter useEffect
    } catch (err) {
      console.error('Error loading dashboard data:', err);
        setAllPayments([]);
        setPayments([]);
    } finally {
      setTableLoading(false);
      setHasPaymentsInitialLoad(true); // Mark that initial load has happened
      if (allPayments.length === 0) {
        setLoading(false);
      }
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

  // Helper function to normalize bank name to standard format
  // Converts bankCode (014, 004, 002, 025) or various bank names to standard names (SCB, KBANK, BBL, BAY)
  const normalizeBankName = (bankName, bankCode = null) => {
    if (!bankName && !bankCode) return 'Unknown';
    
    // First, try to use bankCode if available
    const bankCodeMap = {
      '014': 'SCB',
      '004': 'KBANK',
      '002': 'BBL',
      '025': 'BAY',
      '006': 'KTB',
    };
    
    if (bankCode && bankCodeMap[bankCode]) {
      return bankCodeMap[bankCode];
    }
    
    // If bankName is already a bankCode, convert it
    if (bankCodeMap[bankName]) {
      return bankCodeMap[bankName];
    }
    
    // Try to match bankName to standard names (case-insensitive)
    const name = (bankName || '').toUpperCase();
    
    // Direct match for standard names
    if (['SCB', 'KBANK', 'BBL', 'BAY', 'KTB'].includes(name)) {
      return name;
    }
    
    // Match common variations
    if (name.includes('SCB') || name.includes('SIAM COMMERCIAL') || name.includes('014')) {
      return 'SCB';
    }
    if (name.includes('KBANK') || name.includes('KASIKORN') || name.includes('004')) {
      return 'KBANK';
    }
    if (name.includes('BBL') || name.includes('BANGKOK BANK') || name.includes('002')) {
      return 'BBL';
    }
    if (name.includes('BAY') || name.includes('AYUDHYA') || name.includes('025')) {
      return 'BAY';
    }
    if (name.includes('KTB') || name.includes('KRUNGTHAI') || name.includes('006')) {
      return 'KTB';
    }
    
    // If no match, return original (might be custom bank name)
    return bankName || 'Unknown';
  };

  // Calculate metrics - use appropriate dataset based on active tab
  const calculateMetrics = () => {
    // For bank-registrations, use stats from API if available
    if (activeTab === 'bank-registrations' && bankRegistrationStats) {
      // Use stats from /bank-registrations/stats API
      const response = bankRegistrationStats.data || bankRegistrationStats;
      const summary = response.summary || {};
      const banks = response.banks || [];
      
      // Convert banks array to bankStats object for Donut Chart
      // Normalize bank names to standard format (SCB, KBANK, BBL, BAY, etc.)
      const bankStats = {};
      console.log('🏦 Bank Registrations Stats API - banks array:', banks);
      banks.forEach(bank => {
        // Convert bankCode to string if it's a number
        const bankCodeStr = bank.bankCode ? String(bank.bankCode).padStart(3, '0') : null;
        // Normalize bankName using bankCode if available
        const normalizedBankName = normalizeBankName(bank.bankName, bankCodeStr);
        console.log(`  📊 Original: bankName="${bank.bankName}", bankCode="${bank.bankCode}" → Normalized: "${normalizedBankName}"`);
        if (!bankStats[normalizedBankName]) {
          bankStats[normalizedBankName] = {
            count: 0,
            amount: 0, // Bank registrations don't have amount
            success: 0,
          };
        }
        // Accumulate values in case multiple banks normalize to the same name
        bankStats[normalizedBankName].count += bank.total || 0;
        bankStats[normalizedBankName].success += bank.success || 0;
      });
      console.log('📈 Final bankStats:', bankStats);
      
      return {
        totalAmount: 0, // Bank registrations don't have amount
        successCount: summary.successCount || 0,
        successRate: summary.successRate || 0,
        failedCount: summary.failedCount || 0,
        pendingCount: summary.pendingCount || 0,
        totalCount: summary.totalRegistrations || 0,
        bankStats: bankStats,
      };
    }
    
    // For payments, use stats from API if available
    if (activeTab === 'payments' && paymentStats) {
      const response = paymentStats.data || paymentStats;
      const summary = response.summary || {};
      const banks = response.banks || [];

      // Net KPI requirement:
      // Net = Sell - Buy
      // Buy = Payments.totalAmount, Sell = FundTransfers.totalAmount
      const ftSummary = (fundTransferStats?.data || fundTransferStats)?.summary || {};
      const netTotalAmount = (ftSummary.totalAmount || 0) - (summary.totalAmount || 0);
      
      // Convert banks array to bankStats object for Donut Chart
      // Normalize bank names to standard format (SCB, KBANK, BBL, BAY, etc.)
      const bankStats = {};
      banks.forEach(bank => {
        // Normalize bankName using bankCode if available
        const normalizedBankName = normalizeBankName(bank.bankName, bank.bankCode);
        if (!bankStats[normalizedBankName]) {
          bankStats[normalizedBankName] = {
            count: 0,
            amount: 0,
            success: 0,
          };
        }
        // Accumulate values in case multiple banks normalize to the same name
        bankStats[normalizedBankName].count += bank.total || 0;
        bankStats[normalizedBankName].amount += bank.totalAmount || 0;
        bankStats[normalizedBankName].success += bank.success || 0;
      });
      
      return {
        totalAmount: netTotalAmount,
        successCount: summary.successCount || 0,
        successRate: summary.successRate || 0,
        failedCount: summary.failedCount || 0,
        pendingCount: summary.pendingCount || 0,
        totalCount: summary.totalPayments || 0,
        bankStats: bankStats,
      };
    }
    
    // For fund transfers, use stats from API if available
    if (activeTab === 'fund-transfers' && fundTransferStats) {
      const response = fundTransferStats.data || fundTransferStats;
      const summary = response.summary || {};
      const banks = response.banks || [];
      
      // Convert banks array to bankStats object for Donut Chart
      // Normalize bank names to standard format (SCB, KBANK, BBL, BAY, etc.)
      const bankStats = {};
      banks.forEach(bank => {
        // Normalize bankName using bankCode if available
        const normalizedBankName = normalizeBankName(bank.bankName, bank.bankCode);
        if (!bankStats[normalizedBankName]) {
          bankStats[normalizedBankName] = {
            count: 0,
            amount: 0,
            success: 0,
          };
        }
        // Accumulate values in case multiple banks normalize to the same name
        bankStats[normalizedBankName].count += bank.total || 0;
        bankStats[normalizedBankName].amount += bank.totalAmount || 0;
        bankStats[normalizedBankName].success += bank.success || 0;
      });
      
      return {
        totalAmount: summary.totalAmount || 0,
        successCount: summary.successCount || 0,
        successRate: summary.successRate || 0,
        failedCount: summary.failedCount || 0,
        pendingCount: summary.pendingCount || 0,
        totalCount: summary.totalTransfers || 0,
        bankStats: bankStats,
      };
    }
    
    // For other tabs (QR Payments), calculate from client-side data
    let dataSource = [];
    switch (activeTab) {
      case 'fund-transfers':
        dataSource = allFundTransfers;
        break;
      case 'bank-registrations':
        dataSource = allBankRegistrations;
        break;
      case 'qr-payments':
        dataSource = allQrPayments;
        break;
      case 'payments':
      default:
        dataSource = allPayments;
        break;
    }

    // Helper function to get status from different field names
    const getStatus = (item) => {
      if (activeTab === 'fund-transfers') {
        return item.transferStatus || item.inquiryStatus || item.status || '';
      } else if (activeTab === 'bank-registrations') {
        // For bank registrations, use status field directly (SUCCESS, PENDING, FAILED)
        return item.status || '';
      } else {
        return item.status || '';
      }
    };

    // Helper function to check if status is success
    const isSuccess = (statusValue) => {
      const status = statusValue?.toLowerCase() || '';
      return status === 'success' || status === 'completed' || status === 'complete';
    };

    // Helper function to check if status is pending
    const isPending = (statusValue) => {
      const status = statusValue?.toLowerCase() || '';
      return status === 'pending' || status === 'processing' || status === 'in_progress';
    };

    // Calculate metrics from the selected data source
    const totalAmount = dataSource.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const successCount = dataSource.filter((p) => isSuccess(getStatus(p))).length;
    const successRate = dataSource.length > 0 ? (successCount / dataSource.length) * 100 : 0;
    const failedCount = dataSource.filter((p) => !isSuccess(getStatus(p)) && !isPending(getStatus(p))).length;
    const pendingCount = dataSource.filter((p) => isPending(getStatus(p))).length;

    // For Bank Distribution: use the selected data source
    const bankStats = dataSource.reduce((acc, p) => {
      // Get bank name based on data type, then normalize it
      const rawBank = p.bankName || p.serviceBankName || p.serviceBank || p.bankCode || 'Unknown';
      const bank = normalizeBankName(rawBank, p.bankCode);
      if (!acc[bank]) {
        acc[bank] = { count: 0, amount: 0, success: 0 };
      }
      acc[bank].count++;
      // For QR Payments, use amountInBaht instead of amount
      const amount = p.amount || p.amountInBaht || 0;
      acc[bank].amount += parseFloat(amount || 0);
      if (isSuccess(getStatus(p))) acc[bank].success++;
      return acc;
    }, {});

    return {
      totalAmount,
      successCount,
      successRate,
      failedCount,
      pendingCount,
      totalCount: dataSource.length,
      bankStats,
    };
  };

  const metrics = calculateMetrics();
  const totals = bankInfo.totals || {};

  // Calculate Net Total Payments (Sell - Buy) regardless of active tab
  // Buy = Payments.totalAmount, Sell = FundTransfers.totalAmount
  const calculateNetTotalPayments = () => {
    const pSummary = (paymentStats?.data || paymentStats)?.summary || {};
    const ftSummary = (fundTransferStats?.data || fundTransferStats)?.summary || {};
    const buy = pSummary.totalAmount || 0;
    const sell = ftSummary.totalAmount || 0;
    return {
      net: sell - buy,
      buy: buy,
      sell: sell,
    };
  };

  const netTotalPayments = calculateNetTotalPayments();

  // Calculate Bank Distribution from Fund Transfers - Payments (Sell - Buy)
  // Net = Fund Transfers - Payments (always, regardless of tab)
  const calculateBankDistribution = () => {
    const bankStats = {};
    
    // First, subtract Payments (Buy) - negative values
    if (paymentStats) {
      const pResponse = paymentStats.data || paymentStats;
      const pBanks = pResponse.banks || [];
      pBanks.forEach(bank => {
        const normalizedBankName = normalizeBankName(bank.bankName, bank.bankCode);
        if (!bankStats[normalizedBankName]) {
          bankStats[normalizedBankName] = {
            count: 0,
            amount: 0,
            success: 0,
          };
        }
        // Subtract Payments (Buy) - negative contribution
        bankStats[normalizedBankName].count -= bank.total || 0;
        bankStats[normalizedBankName].amount -= bank.totalAmount || 0;
        bankStats[normalizedBankName].success -= bank.success || 0;
      });
    }
    
    // Then, add Fund Transfers (Sell) - positive values
    if (fundTransferStats) {
      const ftResponse = fundTransferStats.data || fundTransferStats;
      const ftBanks = ftResponse.banks || [];
      ftBanks.forEach(bank => {
        const normalizedBankName = normalizeBankName(bank.bankName, bank.bankCode);
        if (!bankStats[normalizedBankName]) {
          bankStats[normalizedBankName] = {
            count: 0,
            amount: 0,
            success: 0,
          };
        }
        // Add Fund Transfers (Sell) - positive contribution
        bankStats[normalizedBankName].count += bank.total || 0;
        bankStats[normalizedBankName].amount += bank.totalAmount || 0;
        bankStats[normalizedBankName].success += bank.success || 0;
      });
    }
    
    return bankStats;
  };

  const bankDistributionStats = calculateBankDistribution();
  
  // Debug: Log bankDistributionStats to ensure it's being used
  console.log('📊 Bank Distribution Stats (Fund Transfers - Payments):', bankDistributionStats);
  console.log('📊 Payment Stats available:', !!paymentStats);
  console.log('📊 Fund Transfer Stats available:', !!fundTransferStats);

  // Helper function to get bank icon path
  const getBankIconPath = (bankName) => {
    const normalized = normalizeBankName(bankName);
    const bankIconMap = {
      'KBANK': '/icon_bank/KBANK.png',
      'SCB': '/icon_bank/SCB.png',
      'BBL': '/icon_bank/BBL.png',
      'BAY': '/icon_bank/BAY.png',
    };
    return bankIconMap[normalized] || null;
  };

  // Helper function to get status from different field names
  const getStatusForChart = (item) => {
    // When Transaction Flow combines multiple datasets, use flowType on the row.
    // Fallback to activeTab-based logic for older paths.
    if (item?.flowType === 'fund-transfers') {
      return item.transferStatus || item.inquiryStatus || item.status || '';
    }
    if (item?.flowType === 'payments') {
      return item.status || '';
    }
    if (activeTab === 'fund-transfers') return item.transferStatus || item.inquiryStatus || item.status || '';
    return item.status || '';
  };

  // Helper function to check if status is success
  const isSuccessStatus = (statusValue) => {
    const status = statusValue?.toLowerCase() || '';
    return status === 'success' || status === 'completed' || status === 'complete';
  };
  
  // Helper function to check if status is pending (so we can separate "failed" cleanly)
  const isPendingStatus = (statusValue) => {
    const status = statusValue?.toLowerCase() || '';
    return status === 'pending' || status === 'processing' || status === 'in_progress';
  };

  // Chart data - use appropriate dataset based on active tab.
  // Use a dedicated dataset (loaded across all pages) so the chart doesn't follow pagination.
  const getChartDataSource = () => {
    // Prefer the dedicated dataset (loaded across all pages) so the chart doesn't follow pagination.
    const base = Array.isArray(transactionFlowSource) && transactionFlowSource.length > 0
      ? transactionFlowSource
      : (() => {
          let dataSource = [];
    switch (activeTab) {
      case 'fund-transfers':
              dataSource = allFundTransfers;
              break;
      case 'bank-registrations':
              dataSource = allBankRegistrations;
              break;
      case 'qr-payments':
              dataSource = allQrPayments;
              break;
      case 'payments':
      default:
              dataSource = allPayments;
              break;
    }
          return dataSource;
        })();

    return Array.isArray(base) ? base : [];
  };

  const chartDataSource = getChartDataSource();
  // Sort by createdAt ascending so labels and datasets line up consistently
  const chartDataSorted = [...chartDataSource].sort((a, b) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
  // NOTE: timeSeriesData no longer used (Transaction Flow uses TradingView-style chart).
  
  // Map สีตาม bank name โดยตรง (ไม่ใช้ index)
  const bankColorMap = {
    'KBANK': '#22c55e',     // เขียว
    'SCB': '#a855f7',       // ม่วง
    'BBL': '#3b82f6',       // น้ำเงิน
    'KTB': '#64748b',       // เทา
    'BAY': '#f59e0b',       // ส้ม
    'TMB': '#ef4444',       // แดง
    'CIMB': '#f97316',      // ส้มอ่อน
    'UOB': '#eab308',       // เหลือง
    'TBANK': '#84cc16',     // เขียวมะนาว
    'TISCO': '#06b6d4',     // ฟ้า
  };
  
  // For Bank Registrations tab, use metrics.bankStats (count)
  // For other tabs, use bankDistributionStats (Payments + Fund Transfers, amount)
  const bankStatsForChart = activeTab === 'bank-registrations' ? metrics.bankStats : bankDistributionStats;
  const useCount = activeTab === 'bank-registrations';
  
  // Sort bank names by value (descending) to show largest banks first
  const sortedBankNames = Object.keys(bankStatsForChart || {}).sort((a, b) => {
    const statsA = bankStatsForChart[a];
    const statsB = bankStatsForChart[b];
    const valueA = useCount ? (statsA?.count || 0) : (statsA?.amount || 0);
    const valueB = useCount ? (statsB?.count || 0) : (statsB?.amount || 0);
    return valueB - valueA; // Descending order
  });
  
  console.log('=== Bank Distribution Color Mapping (sorted by value) ===');
  console.log('Active Tab:', activeTab);
  console.log('Use Count:', useCount);
  if (activeTab !== 'bank-registrations') {
    console.log('Bank Distribution Stats (Fund Transfers - Payments):', bankStatsForChart);
  } else {
    console.log('Bank Stats for Chart (Bank Registrations):', bankStatsForChart);
  }
  console.log('Sorted Bank Names (by value):', sortedBankNames);
  console.log('Sorted Bank Names length:', sortedBankNames.length);
  sortedBankNames.forEach(bank => {
    const stats = bankStatsForChart[bank];
    const value = useCount ? (stats?.count || 0) : (stats?.amount || 0);
    const color = bankColorMap[bank] || '#9ca3af';
    console.log(`${bank} = ${value.toFixed(2)} (color: ${color})`);
  });
  
  const mappedData = sortedBankNames.map((bank) => {
    const stats = bankStatsForChart[bank];
    return useCount ? (stats?.count || 0) : (stats?.amount || 0);
  });
  
  const bankColors = sortedBankNames.map(bank => bankColorMap[bank] || '#9ca3af');
  
  const bankDistributionData = {
    labels: sortedBankNames,
    datasets: [
      {
        data: mappedData,
        backgroundColor: bankColors,
        borderWidth: 0,
        spacing: 0,
      },
    ],
  };

  // NOTE: Transaction Flow is rendered with TradingView-style chart (lightweight-charts),
  // so Chart.js options are no longer used for that chart.

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
      },
    },
  };

  // Only show full page loading on initial mount (first time component loads)
  // Don't reload entire page when switching tabs
  if (loading && !hasMounted && allPayments.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors">
        <AppLoading size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full space-y-6 bg-gray-50 dark:bg-slate-950 min-h-screen transition-colors">
      {/* KPI Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
        activeTab === 'bank-registrations' ? 'lg:grid-cols-4' : 'lg:grid-cols-5'
      }`}>
        {/* Net Total Payments - Always shown regardless of tab */}
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg hover:border-green-400 dark:hover:border-green-500/50 transition-colors shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider transition-colors">
                Net Total Payments
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono mt-1 transition-colors">
                {formatThaiBaht(netTotalPayments.net)}
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400" />
          </div>
          <div className="mt-2 text-[10px] text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-700/50 pt-2 transition-colors">
            {paymentStats && fundTransferStats ? (
              <div className="flex justify-between gap-4">
                <div>Sell: {formatThaiBaht(netTotalPayments.sell)}</div>
                <div>Buy: {formatThaiBaht(netTotalPayments.buy)}</div>
              </div>
            ) : (
              <span>Net = Sell - Buy</span>
            )}
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg hover:border-green-400 dark:hover:border-green-500/50 transition-colors shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider transition-colors">Success Rate</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono mt-1 transition-colors">{metrics.successRate.toFixed(1)}%</div>
            </div>
            <Activity className="w-5 h-5 text-green-500 dark:text-green-400" />
          </div>
          <div className="flex justify-between items-end mt-2 text-[10px] text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-700/50 pt-2 transition-colors">
            <span>Success: {metrics.successCount}</span>
            <span className="text-gray-600 dark:text-slate-300">Failed: {metrics.failedCount}</span>
          </div>
        </div>

        {/* Net Liquidity - Hidden for Bank Registrations */}
        {activeTab !== 'bank-registrations' && (
          <div className="bg-blue-50 dark:bg-slate-800/50 backdrop-blur-sm border border-blue-100 dark:border-slate-800 p-4 rounded-lg hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider transition-colors">Net Liquidity</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 font-mono mt-1 transition-colors">
                  {formatThaiBaht(totals.netBalance || 0)}
                </div>
              </div>
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 dark:text-slate-400 mt-3 border-t border-blue-100 dark:border-slate-700/50 pt-2 transition-colors">
              <span>Cash In: {formatThaiBaht(totals.totalImport || 0)}</span>
              <span>Cash Out: {formatThaiBaht(totals.totalExport || 0)}</span>
            </div>
          </div>
        )}
        
        {/* Failed Count - Show for all tabs */}
          <div className="bg-red-50 dark:bg-slate-800/50 backdrop-blur-sm border border-red-100 dark:border-slate-800 p-4 rounded-lg hover:border-red-300 dark:hover:border-red-500/50 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
              <div className="text-[10px] text-red-700 dark:text-red-300 font-bold uppercase tracking-wider transition-colors">
                {activeTab === 'bank-registrations' ? 'Failed Registrations' : 
                 activeTab === 'fund-transfers' ? 'Failed Transfers' :
                 activeTab === 'qr-payments' ? 'Failed QR Payments' : 'Failed Payments'}
              </div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100 font-mono mt-1 transition-colors">
                  {metrics.failedCount}
                </div>
              </div>
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-[10px] text-gray-600 dark:text-slate-400 mt-3 border-t border-red-100 dark:border-slate-700/50 pt-2 transition-colors">
            {activeTab === 'bank-registrations' 
              ? 'Registration attempts that failed' 
              : 'Transactions that failed to process'}
            </div>
          </div>

        {/* Pending */}
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg hover:border-yellow-400 dark:hover:border-yellow-500/50 transition-colors shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider transition-colors">
                {activeTab === 'bank-registrations' ? 'Pending Review' : 'Pending Settlement'}
              </div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 font-mono mt-1 transition-colors">{metrics.pendingCount}</div>
            </div>
            <AlertTriangle className="w-5 h-5 text-yellow-500 dark:text-yellow-500" />
          </div>
          <div className="text-[10px] text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-700/50 pt-2 mt-2 transition-colors">
            {activeTab === 'bank-registrations' 
              ? 'Registrations awaiting approval' 
              : 'Transactions awaiting settlement'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className={`grid grid-cols-1 ${activeTab === 'bank-registrations' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6 min-h-80`}>
        {/* Transaction Flow Chart - Hidden for Bank Registrations */}
        {activeTab !== 'bank-registrations' && (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-5 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm transition-colors">
                Transaction Flow
              </h3>
                {/* Chart date range (does not affect table) */}
                <div className="flex items-center gap-2">
                  <select
                    value={transactionFlowRange.preset}
                    onChange={(e) =>
                      setTransactionFlowRange((prev) => ({
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
                  {transactionFlowRange.preset === 'custom' && (
                    <div className="hidden md:flex items-center gap-2" ref={transactionFlowDatePickerRef}>
                      {/* From Date */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setTransactionFlowFromPickerOpen(!transactionFlowFromPickerOpen);
                            setTransactionFlowToPickerOpen(false);
                          }}
                          className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1 flex items-center gap-1 min-w-[100px]"
                        >
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="truncate">
                            {transactionFlowRange.from || 'Start Date'}
                          </span>
                        </button>
                        {transactionFlowFromPickerOpen && (
                          <div className="absolute z-50 mt-1 left-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3">
                            <DayPicker
                              mode="single"
                              locale={enUS}
                              selected={transactionFlowRange.from ? new Date(transactionFlowRange.from) : undefined}
                              onSelect={(date) => {
                                const from = date ? format(date, 'yyyy-MM-dd') : '';
                                setTransactionFlowRange((prev) => ({ ...prev, from }));
                                setTransactionFlowFromPickerOpen(false);
                              }}
                              disabled={(date) => {
                                const to = parseLocalDate(transactionFlowRange.to);
                                if (to) return date > to;
                                return false;
                              }}
                              classNames={{
                                selected: 'bg-blue-500 text-white',
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">-</span>
                      {/* To Date */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setTransactionFlowToPickerOpen(!transactionFlowToPickerOpen);
                            setTransactionFlowFromPickerOpen(false);
                          }}
                          className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1 flex items-center gap-1 min-w-[100px]"
                        >
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="truncate">
                            {transactionFlowRange.to || 'End Date'}
                          </span>
                        </button>
                        {transactionFlowToPickerOpen && (
                          <div className="absolute z-50 mt-1 right-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3">
                            <DayPicker
                              mode="single"
                              locale={enUS}
                              selected={transactionFlowRange.to ? new Date(transactionFlowRange.to) : undefined}
                              onSelect={(date) => {
                                const to = date ? format(date, 'yyyy-MM-dd') : '';
                                setTransactionFlowRange((prev) => ({ ...prev, to }));
                                setTransactionFlowToPickerOpen(false);
                              }}
                              disabled={(date) => {
                                const from = parseLocalDate(transactionFlowRange.from);
                                if (from) return date < from;
                                return false;
                              }}
                              classNames={{
                                selected: 'bg-blue-500 text-white',
                              }}
                            />
                          </div>
                        )}
                      </div>
            </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 px-1.5 py-1">
                  <button
                    type="button"
                    title="Zoom in"
                    onClick={() => transactionFlowChartRef.current?.zoomIn?.()}
                    className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Zoom out"
                    onClick={() => transactionFlowChartRef.current?.zoomOut?.()}
                    className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-gray-200 dark:bg-slate-800" />
                  <button
                    type="button"
                    title="Reset zoom"
                    onClick={() => transactionFlowChartRef.current?.reset?.()}
                    className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  title="Fullscreen"
                  onClick={() => setTransactionFlowFullscreen(true)}
                  className="hidden sm:inline-flex p-2 rounded-full border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => transactionFlowChartRef.current?.reset?.()}
                  className="sm:hidden px-2 py-1 text-[11px] rounded border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="h-[32rem] relative">
              {transactionFlowLoading ? (
                <TransactionFlowLoadingBadge />
              ) : (
                <TransactionFlowTVChart
                  ref={transactionFlowChartRef}
                  rows={chartDataSource}
                  getStatus={getStatusForChart}
                  isSuccess={isSuccessStatus}
                  isPending={isPendingStatus}
                  isLoading={false}
                  theme={theme}
                  isFullscreen={false}
                />
              )}
            </div>
          </div>
        )}

        {/* Bank Distribution / Registrations by Bank */}
        <div className={`bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-5 rounded-lg shadow-sm ${activeTab === 'bank-registrations' ? 'lg:col-span-1' : ''}`}>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4 transition-colors">
            {activeTab === 'bank-registrations' ? 'Registrations by Bank' : 'Bank Distribution'}
          </h3>
          <div className="h-96 flex items-center justify-center relative">
            {tableLoading ? (
              <AppLoading size="md" text="Loading Bank Distribution..." />
            ) : (
              <>
            <Doughnut 
              key={`bank-dist-${activeTab}-${sortedBankNames.length}-${sortedBankNames.join('-')}`}
              data={bankDistributionData} 
              options={donutOptions} 
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-sm text-gray-500 dark:text-slate-400 transition-colors">Total</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                  {useCount 
                    ? Object.values(bankStatsForChart || {}).reduce((sum, stats) => sum + (stats?.count || 0), 0)
                    : formatThaiBaht(Object.values(bankStatsForChart || {}).reduce((sum, stats) => sum + (stats?.amount || 0), 0))
                  }
                </div>
              </div>
            </div>
              </>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 text-xs">
            {sortedBankNames.length > 0 ? (
              sortedBankNames.map((bank) => {
              const stats = bankStatsForChart[bank];
                if (!stats) {
                  console.warn(`⚠️ No stats found for bank: ${bank}`);
                  return null;
                }
              const bankColor = bankColorMap[bank] || '#9ca3af';
                const iconPath = getBankIconPath(bank);
                const value = useCount ? (stats?.count || 0) : (stats?.amount || 0);
                console.log(`🎨 Rendering bank: ${bank}, ${useCount ? 'count' : 'amount'}: ${value}, color: ${bankColor}, iconPath: ${iconPath}`);
              return (
                  <div key={bank} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {iconPath ? (
                        <img 
                          src={iconPath} 
                          alt={bank} 
                          className="w-7 h-7 rounded object-contain flex-shrink-0"
                        />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: bankColor }}></div>
                      )}
                      <span className="text-gray-700 dark:text-slate-300 font-mono transition-colors leading-6">
                        {useCount ? stats.count : formatThaiBaht(stats.amount || 0)}
                      </span>
                  </div>
                </div>
              );
              })
            ) : (
              <div className="text-xs text-gray-500 dark:text-slate-400 text-center py-2">
                No bank data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Treasury Monitor */}
      <TreasuryMonitor />

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden transition-colors shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 transition-colors">
          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 text-xs font-semibold rounded transition-all duration-200 ease-in-out transform ${
                activeTab === 'payments'
                  ? 'bg-red-600 text-white scale-105 shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:scale-[1.02]'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('fund-transfers')}
              className={`px-4 py-2 text-xs font-semibold rounded transition-all duration-200 ease-in-out transform ${
                activeTab === 'fund-transfers'
                  ? 'bg-red-600 text-white scale-105 shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:scale-[1.02]'
              }`}
            >
              Fund Transfers
            </button>
            <button
              onClick={() => setActiveTab('bank-registrations')}
              className={`px-4 py-2 text-xs font-semibold rounded transition-all duration-200 ease-in-out transform ${
                activeTab === 'bank-registrations'
                  ? 'bg-red-600 text-white scale-105 shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:scale-[1.02]'
              }`}
            >
              Bank Registrations
            </button>
            {/* QR Payments tab - แสดงเฉพาะเมื่อมี BILL_PAYMENT */}
            {features.qrPayment && (
            <button
              onClick={() => setActiveTab('qr-payments')}
              className={`px-4 py-2 text-xs font-semibold rounded transition-all duration-200 ease-in-out transform ${
                activeTab === 'qr-payments'
                  ? 'bg-red-600 text-white scale-105 shadow-sm'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:scale-[1.02]'
              }`}
            >
              QR Payments
            </button>
            )}
          </div>
          
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm transition-colors">
              {activeTab === 'qr-payments' ? 'Recent Transactions Qr Payment' : 'Recent Transactions Online Direct Debit'}
            </h3>
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-gray-500 dark:text-slate-400 transition-colors">
                Showing {
                  activeTab === 'payments' ? payments.length :
                  activeTab === 'fund-transfers' ? fundTransfers.length :
                  activeTab === 'qr-payments' ? qrPayments.length :
                  bankRegistrations.length
                } of {
                  activeTab === 'payments' ? pagination.total :
                  activeTab === 'fund-transfers' ? fundTransferPagination.total :
                  activeTab === 'qr-payments' ? qrPaymentPagination.total :
                  bankRegistrationPagination.total
                } transactions
                {hasActiveFilters() && ` (filtered)`}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition ${
                  showFilters || hasActiveFilters()
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/20 dark:border-blue-500/50 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors'
                }`}
              >
                <Filter className="w-3 h-3" />
                Filters
                {hasActiveFilters() && (
                  <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {                    Object.values(
                      activeTab === 'payments' ? filters :
                      activeTab === 'fund-transfers' ? fundTransferFilters :
                      activeTab === 'qr-payments' ? qrPaymentFilters :
                      bankRegistrationFilters
                    ).filter((v) => v && v !== 'all').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-3 transition-colors">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none z-10 transition-colors" />
                  <input
                    type="text"
                    placeholder={
                      activeTab === 'payments' ? "Search (TxID, Ref, Member)..." :
                      activeTab === 'fund-transfers' ? "Search (Merchant ID, RS Trans ID, Ref)..." :
                      activeTab === 'qr-payments' ? "Search (Ref1, Ref2, Internal Ref, Service Code)..." :
                      "Search (Reg Ref, Member Name, Citizen ID)..."
                    }
                    value={
                      activeTab === 'payments' ? filters.search :
                      activeTab === 'fund-transfers' ? fundTransferFilters.search :
                      activeTab === 'qr-payments' ? qrPaymentFilters.search :
                      bankRegistrationFilters.search
                    }
                    onChange={(e) => {
                      if (activeTab === 'payments') {
                        setFilters((prev) => ({ ...prev, search: e.target.value }));
                      } else if (activeTab === 'fund-transfers') {
                        setFundTransferFilters((prev) => ({ ...prev, search: e.target.value }));
                      } else if (activeTab === 'qr-payments') {
                        setQrPaymentFilters((prev) => ({ ...prev, search: e.target.value }));
                      } else {
                        setBankRegistrationFilters((prev) => ({ ...prev, search: e.target.value }));
                      }
                    }}
                    className="w-full pl-10 pr-3 h-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={
                    activeTab === 'payments' ? filters.status :
                    activeTab === 'fund-transfers' ? fundTransferFilters.status :
                    activeTab === 'qr-payments' ? qrPaymentFilters.status :
                    bankRegistrationFilters.status
                  }
                  onChange={(e) => {
                    if (activeTab === 'payments') {
                      setFilters((prev) => ({ ...prev, status: e.target.value }));
                    } else if (activeTab === 'fund-transfers') {
                      setFundTransferFilters((prev) => ({ ...prev, status: e.target.value }));
                    } else if (activeTab === 'qr-payments') {
                      setQrPaymentFilters((prev) => ({ ...prev, status: e.target.value }));
                    } else {
                      setBankRegistrationFilters((prev) => ({ ...prev, status: e.target.value }));
                    }
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="all">All Status</option>
                  {activeTab === 'qr-payments' ? (
                    <>
                      <option value="generated">GENERATED</option>
                      <option value="used">USED</option>
                    </>
                  ) : (
                    <>
                      <option value="SUCCESS">{activeTab === 'bank-registrations' ? 'SUCCESS' : 'Success'}</option>
                      <option value="FAILED">{activeTab === 'bank-registrations' ? 'FAILED' : 'Failed'}</option>
                      {activeTab === 'bank-registrations' ? (
                        <option value="PENDING">PENDING</option>
                      ) : (
                        <>
                          <option value="PENDING">Pending</option>
                          <option value="ERROR">Error</option>
                        </>
                      )}
                    </>
                  )}
                </select>

                {/* Bank Filter */}
                <select
                  value={
                    activeTab === 'payments' ? filters.bank :
                    activeTab === 'fund-transfers' ? fundTransferFilters.bank :
                    activeTab === 'qr-payments' ? qrPaymentFilters.bank :
                    bankRegistrationFilters.bank
                  }
                  onChange={(e) => {
                    if (activeTab === 'payments') {
                      setFilters((prev) => ({ ...prev, bank: e.target.value }));
                    } else if (activeTab === 'fund-transfers') {
                      setFundTransferFilters((prev) => ({ ...prev, bank: e.target.value }));
                    } else if (activeTab === 'qr-payments') {
                      setQrPaymentFilters((prev) => ({ ...prev, bank: e.target.value }));
                    } else {
                      setBankRegistrationFilters((prev) => ({ ...prev, bank: e.target.value }));
                    }
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="all">All Banks</option>
                  {availableBanks.map((bank) => (
                    <option key={bank.bankCode} value={bank.bankCode}>
                      {bank.displayName}
                    </option>
                  ))}
                </select>

                {/* Date Range */}
                <div className="flex gap-2 items-end" ref={datePickerRef}>
                  {/* Start Date (From) */}
                  <div className="relative flex-1">
                    {/* <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider transition-colors">From</label> */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setDateFromPickerOpen(!dateFromPickerOpen);
                          setDateToPickerOpen(false);
                        }}
                        className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors text-left"
                      >
                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span className="pl-6 block truncate">
                          {activeTab === 'payments' ? (filters.dateFrom || 'Start Date') :
                           activeTab === 'fund-transfers' ? (fundTransferFilters.dateFrom || 'Start Date') :
                           activeTab === 'qr-payments' ? (qrPaymentFilters.dateFrom || 'Start Date') :
                           (bankRegistrationFilters.dateFrom || 'Start Date')}
                        </span>
                      </button>
                      {dateFromPickerOpen && (
                        <div className="absolute z-50 mt-1 left-0 bg-white dark:bg-slate-800 border  border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3">
                          <DayPicker
                            mode="single"
                            locale={enUS}
                            selected={
                              activeTab === 'payments' ? (filters.dateFrom ? new Date(filters.dateFrom) : undefined) :
                              activeTab === 'fund-transfers' ? (fundTransferFilters.dateFrom ? new Date(fundTransferFilters.dateFrom) : undefined) :
                              activeTab === 'qr-payments' ? (qrPaymentFilters.dateFrom ? new Date(qrPaymentFilters.dateFrom) : undefined) :
                              (bankRegistrationFilters.dateFrom ? new Date(bankRegistrationFilters.dateFrom) : undefined)
                            }
onSelect={(date) => {
                                const dateFrom = date ? format(date, 'yyyy-MM-dd') : '';
                                if (activeTab === 'payments') setFilters((prev) => ({ ...prev, dateFrom }));
                                else if (activeTab === 'fund-transfers') setFundTransferFilters((prev) => ({ ...prev, dateFrom }));
                                else if (activeTab === 'qr-payments') setQrPaymentFilters((prev) => ({ ...prev, dateFrom }));
                                else setBankRegistrationFilters((prev) => ({ ...prev, dateFrom }));
                                setDateFromPickerOpen(false);
                              }}
                            classNames={{
                              selected: 'bg-blue-500 text-white',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="self-center pb-0 text-slate-500 dark:text-slate-400 text-xs">–</span>
                  {/* End Date (To) */}
                  <div className="relative flex-1">
                    {/* <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider transition-colors">To</label> */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setDateToPickerOpen(!dateToPickerOpen);
                          setDateFromPickerOpen(false);
                        }}
                        className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors text-left"
                      >
                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span className="pl-6 block truncate">
                          {activeTab === 'payments' ? (filters.dateTo || 'End Date') :
                           activeTab === 'fund-transfers' ? (fundTransferFilters.dateTo || 'End Date') :
                           activeTab === 'qr-payments' ? (qrPaymentFilters.dateTo || 'End Date') :
                           (bankRegistrationFilters.dateTo || 'End Date')}
                        </span>
                      </button>
                      {dateToPickerOpen && (
                        <div className="absolute z-50 mt-1 right-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3">
                          <DayPicker
                            mode="single"
                            locale={enUS}
                            selected={
                              activeTab === 'payments' ? (filters.dateTo ? new Date(filters.dateTo) : undefined) :
                              activeTab === 'fund-transfers' ? (fundTransferFilters.dateTo ? new Date(fundTransferFilters.dateTo) : undefined) :
                              activeTab === 'qr-payments' ? (qrPaymentFilters.dateTo ? new Date(qrPaymentFilters.dateTo) : undefined) :
                              (bankRegistrationFilters.dateTo ? new Date(bankRegistrationFilters.dateTo) : undefined)
                            }
onSelect={(date) => {
                                const dateTo = date ? format(date, 'yyyy-MM-dd') : '';
                                if (activeTab === 'payments') setFilters((prev) => ({ ...prev, dateTo }));
                                else if (activeTab === 'fund-transfers') setFundTransferFilters((prev) => ({ ...prev, dateTo }));
                                else if (activeTab === 'qr-payments') setQrPaymentFilters((prev) => ({ ...prev, dateTo }));
                                else setBankRegistrationFilters((prev) => ({ ...prev, dateTo }));
                                setDateToPickerOpen(false);
                              }}
                            classNames={{
                              selected: 'bg-blue-500 text-white',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

               

                
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters() && (
                <div className="flex justify-end">
                  <button
                    onClick={
                      activeTab === 'payments' ? clearFilters :
                      activeTab === 'fund-transfers' ? clearFundTransferFilters :
                      activeTab === 'qr-payments' ? clearQrPaymentFilters :
                      clearBankRegistrationFilters
                    }
                    className="flex items-center gap-1 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-xs text-red-400 transition"
                  >
                    <X className="w-3 h-3" />
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto relative">
          <div>
          {activeTab === 'payments' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-500 transition-colors">
                <tr>
                  <th className="px-5 py-2 font-semibold text-center">No.</th>
                  <th className="px-5 py-2 font-semibold">Date</th>
                  <th className="px-5 py-2 font-semibold">Time</th>
                  <th className="px-5 py-2 font-semibold">Ref</th>
                  <th className="px-5 py-2 font-semibold">Trans ID</th>
                  <th className="px-5 py-2 font-semibold">Bank</th>
                  <th className="px-5 py-2 font-semibold">Member</th>
                  <th className="px-5 py-2 font-semibold text-right">Amount</th>
                  <th className="px-5 py-2 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-700 dark:text-slate-400 font-mono transition-colors">
                {tableLoading ? (
                <tr>
                  <td colSpan="9" className="px-5 py-16 text-center">
                    <div className="flex justify-center">
                      <AppLoading size="md" text="Loading Payments..." />
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-5 py-4 text-center text-slate-600 dark:text-slate-500 transition-colors">
                    No transactions found
                  </td>
                </tr>
              ) : (
                payments.map((payment, index) => {
                  const getStatusColor = (status) => {
                    switch (status?.toLowerCase()) {
                      case 'success':
                        return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
                      case 'failed':
                      case 'error':
                        return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
                      case 'pending':
                        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
                      default:
                        return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
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

                  const statusStyle = getStatusColor(payment.status);
                  const rowNumber = ((pagination.page - 1) * pagination.limit) + index + 1;
                  return (
                    <tr 
                      key={payment.id} 
                      className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                      // onClick={() => navigate('/payments')}
                    >
                      <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-400 font-mono text-xs transition-colors">{rowNumber}</td>
                      <td className="px-5 py-3 text-slate-800 dark:text-slate-300 transition-colors">{formatDate(payment.createdAt).date}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs transition-colors">{formatDate(payment.createdAt).time}</td>
                      <td className="px-5 py-3">
                        <div className="text-slate-800 dark:text-slate-300 transition-colors">{payment.ref || payment.ref1 || '-'}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-800 dark:text-slate-300 font-mono text-xs transition-colors">{payment.txnNumber || '-'}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-800 dark:text-slate-300 transition-colors">{payment.bankName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">{payment.bankCode}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-800 dark:text-slate-300 transition-colors">{payment.member?.name || '-'}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">{payment.member?.citizenId || ''}</div>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-900 dark:text-white font-bold font-mono transition-colors">
                        {formatThaiBaht(payment.amount)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} px-2 py-0.5 rounded text-[10px] font-bold border`}>
                          {payment.status}
                        </span>
                        {payment.statusCode && (
                          <div className="text-[10px] text-slate-500 mt-1">Code: {payment.statusCode}</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          ) : activeTab === 'fund-transfers' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-500 transition-colors">
                <tr>
                  <th className="px-5 py-2 font-semibold text-center">No.</th>
                  <th className="px-5 py-2 font-semibold">Date</th>
                  <th className="px-5 py-2 font-semibold">Time</th>
                  <th className="px-5 py-2 font-semibold">Ref</th>
                  <th className="px-5 py-2 font-semibold">Trans ID</th>
                  <th className="px-5 py-2 font-semibold">Bank</th>
                  <th className="px-5 py-2 font-semibold">Member</th>
                  <th className="px-5 py-2 font-semibold">From / To</th>
                  <th className="px-5 py-2 font-semibold text-right">Amount</th>
                  <th className="px-5 py-2 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-700 dark:text-slate-400 font-mono transition-colors">
                {tableLoading ? (
                  <tr>
                    <td colSpan="10" className="px-5 py-16 text-center">
                      <div className="flex justify-center">
                        <AppLoading size="md" text="Loading Fund Transfers..." />
                      </div>
                    </td>
                  </tr>
                ) : fundTransfers.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-5 py-4 text-center text-slate-600 dark:text-slate-500 transition-colors">
                      No fund transfers found
                    </td>
                  </tr>
                ) : (
                  fundTransfers.map((transfer, index) => {
                    const getStatusColor = (status) => {
                      switch (status?.toLowerCase()) {
                        case 'success':
                          return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
                        case 'failed':
                        case 'error':
                          return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
                        case 'pending':
                          return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
                        default:
                          return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
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

                    const status = transfer.transferStatus || transfer.inquiryStatus || 'UNKNOWN';
                    const statusStyle = getStatusColor(status);
                    const rowNumber = ((fundTransferPagination.page - 1) * fundTransferPagination.limit) + index + 1;
                    const dateTime = transfer.createdAt || transfer.requestDateTime;

                    return (
                      <tr
                        key={transfer.id}
                        className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                        // onClick={() => navigate('/fund-transfers')}
                      >
                        <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-400 font-mono text-xs transition-colors">{rowNumber}</td>
                        <td className="px-5 py-3 text-slate-800 dark:text-slate-300 transition-colors">{formatDate(dateTime).date}</td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs transition-colors">{formatDate(dateTime).time}</td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 transition-colors">{transfer.ref1 || '-'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 font-mono text-xs transition-colors">{transfer.rsTransID || '-'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 transition-colors">{transfer.serviceBankName || '-'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">{transfer.serviceBankCode || ''}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 transition-colors">{transfer.member?.name || '-'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">{transfer.member?.citizenId || ''}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 transition-colors">{transfer.fromAccountNo || '-'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">→ {transfer.toAccountNo || '-'}</div>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-900 dark:text-white font-bold font-mono transition-colors">
                          {formatThaiBaht(transfer.amount)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} px-2 py-0.5 rounded text-[10px] font-bold border`}>
                            {status}
                          </span>
                          {transfer.responseCode && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 transition-colors">Code: {transfer.responseCode}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : activeTab === 'bank-registrations' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-500 transition-colors">
                <tr>
                  <th className="px-2 py-2 font-semibold text-center w-16">No.</th>
                  <th className="px-5 py-2 font-semibold">Reg Ref</th>
                  <th className="px-5 py-2 font-semibold">Bank</th>
                  <th className="px-5 py-2 font-semibold">Member</th>
                  <th className="px-5 py-2 font-semibold">Date</th>
                  <th className="px-5 py-2 font-semibold">Time</th>
                  <th className="px-5 py-2 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-700 dark:text-slate-400 font-mono transition-colors">
                {tableLoading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-16 text-center">
                      <div className="flex justify-center">
                        <AppLoading size="md" text="Loading Bank Registrations..." />
                      </div>
                    </td>
                  </tr>
                ) : bankRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-4 text-center text-slate-600 dark:text-slate-500 transition-colors">
                      No registrations found
                    </td>
                  </tr>
                ) : (
                  bankRegistrations.map((registration, index) => {
                    const getStatusColor = (status) => {
                      switch (status?.toUpperCase()) {
                        case 'SUCCESS':
                          return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
                        case 'FAILED':
                          return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
                        case 'PENDING':
                          return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
                        default:
                          return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
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

                    const statusStyle = getStatusColor(registration.status);
                    const rowNumber = ((bankRegistrationPagination.page - 1) * bankRegistrationPagination.limit) + index + 1;
                    const dateTime = formatDate(registration.createdAt);

                    return (
                      <tr 
                        key={registration.id} 
                        className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                        // onClick={() => navigate('/bank-registrations')}
                      >
                        <td className="px-2 py-3 text-center text-slate-600 dark:text-slate-400 font-mono text-xs transition-colors">{rowNumber}</td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 font-mono text-xs transition-colors">{registration.regRef || '-'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 transition-colors">{registration.bankName || '-'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">{registration.bankCode || '-'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 transition-colors">{registration.member?.name || '-'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono transition-colors">{registration.member?.citizenId || '-'}</div>
                        </td>
                        <td className="px-5 py-3 text-slate-800 dark:text-slate-300 transition-colors">{dateTime.date}</td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs transition-colors">{dateTime.time}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} px-2 py-0.5 rounded text-[10px] font-bold border`}>
                            {registration.status || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-500 transition-colors">
                <tr>
                  <th className="px-5 py-2 font-semibold text-center">No.</th>
                  <th className="px-5 py-2 font-semibold">Date</th>
                  <th className="px-5 py-2 font-semibold">Time</th>
                  <th className="px-5 py-2 font-semibold">Ref1</th>
                  <th className="px-5 py-2 font-semibold">Ref2</th>
                  <th className="px-5 py-2 font-semibold">Internal Ref</th>
                  <th className="px-5 py-2 font-semibold">Service Code</th>
                  <th className="px-5 py-2 font-semibold">Bank Code</th>
                  <th className="px-5 py-2 font-semibold">Tax ID</th>
                  <th className="px-5 py-2 font-semibold text-right">Amount</th>
                  <th className="px-5 py-2 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 text-slate-700 dark:text-slate-400 font-mono transition-colors">
                {tableLoading ? (
                  <tr>
                    <td colSpan="11" className="px-5 py-16 text-center">
                      <div className="flex justify-center">
                        <AppLoading size="md" text="Loading QR Payments..." />
                      </div>
                    </td>
                  </tr>
                ) : qrPayments.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-5 py-4 text-center text-slate-600 dark:text-slate-500 transition-colors">
                      No QR payments found
                    </td>
                  </tr>
                ) : (
                  qrPayments.map((qrPayment, index) => {
                    const getStatusColor = (status) => {
                      switch (status?.toUpperCase()) {
                        case 'GENERATED':
                          return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
                        case 'USED':
                          return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
                        default:
                          return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
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

                    const statusStyle = getStatusColor(qrPayment.status);
                    const rowNumber = ((qrPaymentPagination.page - 1) * qrPaymentPagination.limit) + index + 1;
                    const dateTime = formatDate(qrPayment.createdAt);

                    return (
                      <tr 
                        key={qrPayment.id} 
                        className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedQrPaymentId(qrPayment.id)}
                      >
                        <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-400 font-mono text-xs transition-colors">{rowNumber}</td>
                        <td className="px-5 py-3 text-slate-800 dark:text-slate-300 transition-colors">{dateTime.date}</td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs transition-colors">{dateTime.time}</td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 font-mono text-xs transition-colors">{qrPayment.ref1 || '-'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 font-mono text-xs transition-colors">{qrPayment.ref2 || '-'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 font-mono text-xs transition-colors">{qrPayment.internalRef || '-'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 transition-colors">{qrPayment.serviceCode || '-'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 font-mono text-xs transition-colors">{qrPayment.bankCode || '-'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 transition-colors">Suffix: {qrPayment.suffix || '-'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800 dark:text-slate-300 font-mono text-xs transition-colors">{qrPayment.taxId || '-'}</div>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-900 dark:text-white font-bold font-mono transition-colors">
                          {formatThaiBaht(qrPayment.amountInBaht)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} px-2 py-0.5 rounded text-[10px] font-bold border`}>
                            {qrPayment.status || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
          </div>
        </div>
        
        {/* Pagination */}
        {activeTab === 'payments' && pagination.total > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 flex justify-between items-center transition-colors">
            <div className="text-xs text-gray-600 dark:text-slate-400 transition-colors">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-xs text-gray-700 dark:text-slate-300 transition-colors">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {activeTab === 'fund-transfers' && fundTransferPagination.total > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 flex justify-between items-center transition-colors">
            <div className="text-xs text-gray-600 dark:text-slate-400 transition-colors">
              Showing {((fundTransferPagination.page - 1) * fundTransferPagination.limit) + 1} to {Math.min(fundTransferPagination.page * fundTransferPagination.limit, fundTransferPagination.total)} of {fundTransferPagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFundTransferPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={fundTransferPagination.page === 1}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-xs text-gray-700 dark:text-slate-300 transition-colors">
                Page {fundTransferPagination.page} of {fundTransferPagination.totalPages}
              </span>
              <button
                onClick={() => setFundTransferPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={fundTransferPagination.page >= fundTransferPagination.totalPages}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {activeTab === 'bank-registrations' && bankRegistrationPagination.total > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 flex justify-between items-center transition-colors">
            <div className="text-xs text-gray-600 dark:text-slate-400 transition-colors">
              Showing {((bankRegistrationPagination.page - 1) * bankRegistrationPagination.limit) + 1} to {Math.min(bankRegistrationPagination.page * bankRegistrationPagination.limit, bankRegistrationPagination.total)} of {bankRegistrationPagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setBankRegistrationPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={bankRegistrationPagination.page === 1}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-xs text-gray-700 dark:text-slate-300 transition-colors">
                Page {bankRegistrationPagination.page} of {bankRegistrationPagination.totalPages}
              </span>
              <button
                onClick={() => setBankRegistrationPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={bankRegistrationPagination.page >= bankRegistrationPagination.totalPages}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {activeTab === 'qr-payments' && qrPaymentPagination.total > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 flex justify-between items-center transition-colors">
            <div className="text-xs text-gray-600 dark:text-slate-400 transition-colors">
              Showing {((qrPaymentPagination.page - 1) * qrPaymentPagination.limit) + 1} to {Math.min(qrPaymentPagination.page * qrPaymentPagination.limit, qrPaymentPagination.total)} of {qrPaymentPagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setQrPaymentPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={qrPaymentPagination.page === 1}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-xs text-gray-700 dark:text-slate-300 transition-colors">
                Page {qrPaymentPagination.page} of {qrPaymentPagination.totalPages}
              </span>
              <button
                onClick={() => setQrPaymentPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={qrPaymentPagination.page >= qrPaymentPagination.totalPages}
                className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* QR Payment Detail Modal */}
      <QrPaymentDetailModal
        isOpen={!!selectedQrPaymentId}
        onClose={() => setSelectedQrPaymentId(null)}
        qrPaymentId={selectedQrPaymentId}
      />

      {/* Transaction Flow fullscreen overlay */}
      {transactionFlowFullscreen && activeTab !== 'bank-registrations' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
          {/* click outside to close */}
          <button
            type="button"
            aria-label="Close fullscreen"
            onClick={() => setTransactionFlowFullscreen(false)}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: 'default' }}
          />

          <div className="absolute inset-0 p-3 sm:p-6 flex">
            <div className="relative w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="font-bold text-gray-900 dark:text-white text-sm">Transaction Flow</div>
                  <div className="flex items-center gap-2">
                    <select
                      value={transactionFlowRange.preset}
                      onChange={(e) =>
                        setTransactionFlowRange((prev) => ({
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
                    {transactionFlowRange.preset === 'custom' && (
  <div className="flex items-center gap-2" ref={transactionFlowDatePickerRef}>
  {/* From Date */}
  <div className="relative">
    <button
      type="button"
      onClick={() => {
        setTransactionFlowFromPickerOpen(!transactionFlowFromPickerOpen);
        setTransactionFlowToPickerOpen(false);
      }}
      className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1 flex items-center gap-1 min-w-[100px]"
    >
      <Calendar className="w-3 h-3 text-gray-400" />
      <span className="truncate">
        {transactionFlowRange.from || 'Start'}
      </span>
    </button>
    {transactionFlowFromPickerOpen && (
      <div className="absolute z-50 mt-1 left-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <DayPicker
          mode="single"
          locale={enUS}
          selected={transactionFlowRange.from ? new Date(transactionFlowRange.from) : undefined}
          onSelect={(date) => {
            const from = date ? format(date, 'yyyy-MM-dd') : '';
            setTransactionFlowRange((prev) => ({ ...prev, from }));
            setTransactionFlowFromPickerOpen(false);
          }}
          disabled={(date) => {
            const to = parseLocalDate(transactionFlowRange.to);
            if (to) return date > to;
            return false;
          }}
          classNames={{
            selected: 'bg-blue-500 text-white',
          }}
        />
      </div>
    )}
  </div>
  <span className="text-xs text-gray-400">-</span>
  {/* To Date */}
  <div className="relative">
    <button
      type="button"
      onClick={() => {
        setTransactionFlowToPickerOpen(!transactionFlowToPickerOpen);
        setTransactionFlowFromPickerOpen(false);
      }}
      className="text-xs rounded-md border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-gray-700 dark:text-slate-200 px-2 py-1 flex items-center gap-1 min-w-[100px]"
    >
      <Calendar className="w-3 h-3 text-gray-400" />
      <span className="truncate">
        {transactionFlowRange.to || 'End'}
      </span>
    </button>
    {transactionFlowToPickerOpen && (
      <div className="absolute z-50 mt-1 right-0 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <DayPicker
          mode="single"
          locale={enUS}
          selected={transactionFlowRange.to ? new Date(transactionFlowRange.to) : undefined}
          onSelect={(date) => {
            const to = date ? format(date, 'yyyy-MM-dd') : '';
            setTransactionFlowRange((prev) => ({ ...prev, to }));
            setTransactionFlowToPickerOpen(false);
          }}
          disabled={(date) => {
            const from = parseLocalDate(transactionFlowRange.from);
            if (from) return date < from;
            return false;
          }}
          classNames={{
            selected: 'bg-blue-500 text-white',
          }}
        />
      </div>
    )}
  </div>
</div>
)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 px-1.5 py-1">
                    <button
                      type="button"
                      title="Zoom in"
                      onClick={() => transactionFlowChartRef.current?.zoomIn?.()}
                      className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Zoom out"
                      onClick={() => transactionFlowChartRef.current?.zoomOut?.()}
                      className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-slate-800" />
                    <button
                      type="button"
                      title="Reset zoom"
                      onClick={() => transactionFlowChartRef.current?.reset?.()}
                      className="p-1.5 rounded-full text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    title="Exit fullscreen (Esc)"
                    onClick={() => setTransactionFlowFullscreen(false)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-gray-800 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <Minimize2 className="w-4 h-4" />
                    <span className="text-xs font-semibold">Close</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 relative p-2 sm:p-4">
                {transactionFlowLoading ? (
                  <TransactionFlowLoadingBadge />
                ) : (
                  <TransactionFlowTVChart
                    ref={transactionFlowChartRef}
                    rows={chartDataSource}
                    getStatus={getStatusForChart}
                    isSuccess={isSuccessStatus}
                    isPending={isPendingStatus}
                    isLoading={false}
                    theme="light"
                    isFullscreen={true}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

