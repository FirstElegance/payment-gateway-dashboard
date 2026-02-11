import { useState, useEffect } from 'react';
import { paymentRegistrationsAPI } from '../services/api';
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
import { Line, Doughnut } from 'react-chartjs-2';
import { 
  AlertTriangle, 
  Activity, 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  BellRing,
  Landmark,
  BarChart2
} from 'lucide-react';
import TreasuryMonitor from './TreasuryMonitor';
import PaymentDetailModal from './PaymentDetailModal';
import AppLoading from './AppLoading';

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
  Filler
);

/**
 * ELEGANCE PAYMENT Executive Dashboard
 * Dashboard แบบ Executive Command Center สำหรับแสดง ELEGANCE PAYMENT
 */
const PaymentRegistrationsDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]); // For accurate metrics calculation
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  // Filter states
  const [bankCodeFilter, setBankCodeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPayments();
    loadAllPayments(); // Load all payments for accurate metrics
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    let filtered = [...payments];

    if (bankCodeFilter) {
      filtered = filtered.filter(payment => 
        payment.bankCode?.toLowerCase().includes(bankCodeFilter.toLowerCase()) ||
        payment.bankName?.toLowerCase().includes(bankCodeFilter.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(payment => 
        payment.status?.toLowerCase().includes(statusFilter.toLowerCase())
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.ref?.toLowerCase().includes(term) ||
        payment.txnNumber?.toLowerCase().includes(term) ||
        payment.member?.name?.toLowerCase().includes(term) ||
        payment.member?.citizenId?.toLowerCase().includes(term)
      );
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setFilteredPayments(sorted);
  }, [payments, bankCodeFilter, statusFilter, searchTerm]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentRegistrationsAPI.getAll(pagination.page, pagination.limit);
      
      // Handle paginated response
      const paymentsArray = Array.isArray(response?.data) 
        ? response.data 
        : Array.isArray(response) 
          ? response 
          : [];
      
      setPayments(paymentsArray);
      setFilteredPayments(paymentsArray);
      
      // Update pagination info if available
      if (response?.total !== undefined) {
        setPagination(prev => ({
          ...prev,
          total: response.total || 0,
          totalPages: response.totalPages || Math.ceil((response.total || 0) / prev.limit),
        }));
      }
    } catch (err) {
      const errorMsg = err.message || err.response?.data?.message || 'Failed to load ELEGANCE PAYMENT';
      setError(errorMsg);
      console.error('Error loading payments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load all payments for accurate metrics calculation
  const loadAllPayments = async () => {
    try {
      const response = await paymentRegistrationsAPI.getAll(1, 10000); // Get all payments
      const paymentsArray = Array.isArray(response?.data) 
        ? response.data 
        : Array.isArray(response) 
          ? response 
          : [];
      setAllPayments(paymentsArray);
    } catch (err) {
      console.error('Error loading all payments for metrics:', err);
    }
  };

  // Calculate metrics - use allPayments for accurate totals (not just current page)
  const calculateMetrics = () => {
    // Use ALL payments (allPayments) for accurate metrics across all pages
    const totalAmount = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const successCount = allPayments.filter(p => p.status === 'Success').length;
    const successRate = allPayments.length > 0 ? (successCount / allPayments.length) * 100 : 0;
    const failedCount = allPayments.filter(p => p.status !== 'Success').length;
    const pendingCount = allPayments.filter(p => p.status === 'Pending').length;
    
    // Group by bank
    const bankStats = allPayments.reduce((acc, p) => {
      const bank = p.bankName || 'Unknown';
      if (!acc[bank]) {
        acc[bank] = { count: 0, amount: 0, success: 0 };
      }
      acc[bank].count++;
      acc[bank].amount += parseFloat(p.amount || 0);
      if (p.status === 'Success') acc[bank].success++;
      return acc;
    }, {});

    return {
      totalAmount,
      successCount,
      successRate,
      failedCount,
      pendingCount,
      totalCount: allPayments.length,
      bankStats,
    };
  };

  const metrics = calculateMetrics();

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return '0.00';
    try {
      return parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch {
      return amount;
    }
  };

  const formatThaiBaht = (amount) => {
    return `฿${formatAmount(amount)}`;
  };

  // Helper function to get bank icon path
  const getBankIconPath = (bankName) => {
    const bankIconMap = {
      'KBANK': '/icon_bank/KBANK.png',
      'SCB': '/icon_bank/SCB.png',
      'BBL': '/icon_bank/BBL.png',
      'BAY': '/icon_bank/BAY.png',
    };
    return bankIconMap[bankName] || null;
  };

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
        return { bg: 'bg-gray-100 dark:bg-slate-500/20', text: 'text-gray-700 dark:text-slate-400', border: 'border-gray-200 dark:border-slate-500/30' };
    }
  };

  // Chart data - filter to show only successful transactions
  const successfulPayments = allPayments.filter(p => p.status === 'Success');
  const timeSeriesData = {
    labels: successfulPayments.map(payment => formatDate(payment?.createdAt)).reverse(),
    datasets: [
      {
        label: 'Successful Transactions',
        data: successfulPayments.map(p => parseFloat(p.amount || 0)).reverse(),
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  const bankDistributionData = {
    labels: Object.keys(metrics.bankStats),
    datasets: [
      {
        data: Object.values(metrics.bankStats).map(b => b.amount),
        backgroundColor: ['#a855f7', '#22c55e', '#3b82f6', '#64748b', '#f59e0b'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: '#475569',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        grid: { color: '#1e293b' },
        ticks: { color: '#94a3b8' },
        beginAtZero: true,
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8' },
      },
    },
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
      },
    },
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors">
        <AppLoading size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full space-y-6 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-200 transition-colors min-h-screen">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Registrations</h2>
        <button
          onClick={loadPayments}
          className="h-8 px-4 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded text-xs font-bold text-gray-700 dark:text-slate-300 transition-colors"
        >
          Refresh
        </button>
      </div>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Amount */}
          <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg hover:border-green-400 dark:hover:border-green-500/50 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-[10px] text-gray-600 dark:text-slate-400 font-bold uppercase tracking-wider transition-colors">Total Amount (Today)</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white font-mono mt-1 transition-colors">{formatThaiBaht(metrics.totalAmount)}</div>
              </div>
              <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400 transition-colors" />
            </div>
            <div className="mt-2 text-[10px] text-gray-600 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700/50 pt-2 transition-colors">
              <span>Volume: {metrics.totalCount} transactions</span>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg hover:border-green-400 dark:hover:border-green-500/50 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-[10px] text-gray-600 dark:text-slate-400 font-bold uppercase tracking-wider transition-colors">Success Rate</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono mt-1 transition-colors">{metrics.successRate.toFixed(1)}%</div>
              </div>
              <Activity className="w-5 h-5 text-green-500 dark:text-green-400 transition-colors" />
            </div>
            <div className="flex justify-between items-end mt-2 text-[10px] text-gray-600 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700/50 pt-2 transition-colors">
              <span>Success: {metrics.successCount}</span>
              <span className="text-gray-700 dark:text-slate-300 transition-colors">Failed: {metrics.failedCount}</span>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg hover:border-yellow-400 dark:hover:border-yellow-500/50 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-[10px] text-gray-600 dark:text-slate-400 font-bold uppercase tracking-wider transition-colors">Pending Settlement</div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 font-mono mt-1 transition-colors">{metrics.pendingCount}</div>
              </div>
              <AlertTriangle className="w-5 h-5 text-yellow-500 dark:text-yellow-500 transition-colors" />
            </div>
            <div className="text-[10px] text-gray-600 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700/50 pt-2 mt-2 transition-colors">
              Transactions awaiting settlement
            </div>
          </div>

          {/* Failed */}
          <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg hover:border-red-400 dark:hover:border-red-500/50 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-[10px] text-gray-600 dark:text-slate-400 font-bold uppercase tracking-wider transition-colors">Failed Transactions</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-mono mt-1 transition-colors">{metrics.failedCount}</div>
              </div>
              <TrendingDown className="w-5 h-5 text-red-500 dark:text-red-400 transition-colors" />
            </div>
            <div className="text-[10px] text-gray-600 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700/50 pt-2 mt-2 transition-colors">
              Requires attention
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-80">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-5 rounded-lg transition-colors shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 transition-colors">
                <BarChart2 className="w-4 h-4 text-gray-600 dark:text-slate-400 transition-colors" />
                Transaction Flow
              </h3>
            </div>
            <div className="h-64">
              <Line data={timeSeriesData} options={chartOptions} />
            </div>
          </div>

          {/* Bank Distribution */}
          <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-5 rounded-lg transition-colors shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4 transition-colors">Bank Distribution</h3>
            <div className="h-48 flex items-center justify-center relative">
              <Doughnut data={bankDistributionData} options={donutOptions} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-xs text-gray-600 dark:text-slate-400 transition-colors">Total</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white transition-colors">{formatThaiBaht(metrics.totalAmount)}</div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-[10px]">
              {Object.entries(metrics.bankStats).slice(0, 4).map(([bank, stats], idx) => {
                const colors = ['#a855f7', '#22c55e', '#3b82f6', '#64748b'];
                const iconPath = getBankIconPath(bank);
                return (
                  <div key={bank} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {iconPath ? (
                        <img 
                          src={iconPath} 
                          alt={bank} 
                          className="w-5 h-5 rounded object-contain flex-shrink-0"
                        />
                      ) : (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx] }}></div>
                      )}
                      <span className="text-gray-700 dark:text-slate-300 transition-colors">{bank}</span>
                    </div>
                    <span className="text-gray-600 dark:text-slate-400 transition-colors">{formatThaiBaht(stats.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Treasury Monitor */}
        <TreasuryMonitor />

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              value={bankCodeFilter}
              onChange={(e) => setBankCodeFilter(e.target.value)}
              placeholder="Filter by bank..."
              className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-slate-500 focus:outline-none transition-colors"
            />
            <input
              type="text"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="Filter by status..."
              className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-slate-500 focus:outline-none transition-colors"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions..."
              className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-slate-500 focus:outline-none transition-colors"
            />
          </div>
          {(bankCodeFilter || statusFilter || searchTerm) && (
            <button
              onClick={() => {
                setBankCodeFilter('');
                setStatusFilter('');
                setSearchTerm('');
              }}
              className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden transition-colors">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center transition-colors">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Live Transactions</h3>
            <div className="text-[10px] text-gray-600 dark:text-slate-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total || payments.length)} of {pagination.total || payments.length}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-600 dark:text-slate-500 transition-colors">
                <tr>
                  <th className="px-5 py-2 font-semibold">Time</th>
                  <th className="px-5 py-2 font-semibold">TxID / Ref</th>
                  <th className="px-5 py-2 font-semibold">Bank</th>
                  <th className="px-5 py-2 font-semibold">Member</th>
                  <th className="px-5 py-2 font-semibold text-right">Amount</th>
                  <th className="px-5 py-2 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 text-gray-700 dark:text-slate-400 font-mono transition-colors">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-4 text-center text-gray-500 dark:text-slate-500 transition-colors">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => {
                    const statusStyle = getStatusColor(payment.status);
                    return (
                      <tr 
                        key={payment.id} 
                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedPaymentId(payment.id)}
                      >
                        <td className="px-5 py-3 text-gray-700 dark:text-slate-300 transition-colors">{formatDate(payment.createdAt)}</td>
                        <td className="px-5 py-3">
                          <div className="text-gray-900 dark:text-slate-300 transition-colors">{payment.ref}</div>
                          <div className="text-[10px] text-gray-500 dark:text-slate-500 transition-colors">{payment.txnNumber}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-gray-900 dark:text-slate-300 transition-colors">{payment.bankName}</div>
                          <div className="text-[10px] text-gray-500 dark:text-slate-500 transition-colors">{payment.bankCode}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-gray-900 dark:text-slate-300 transition-colors">{payment.member?.name || '-'}</div>
                          <div className="text-[10px] text-gray-500 dark:text-slate-500 transition-colors">{payment.member?.citizenId || ''}</div>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-900 dark:text-white font-bold font-mono transition-colors">
                          {formatThaiBaht(payment.amount)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} px-2 py-0.5 rounded text-[10px] font-bold border`}>
                            {payment.status}
                          </span>
                          {payment.statusCode && (
                            <div className="text-[10px] text-gray-500 dark:text-slate-500 mt-1 transition-colors">Code: {payment.statusCode}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 flex justify-between items-center transition-colors">
              <div className="text-xs text-gray-600 dark:text-slate-400 transition-colors">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 rounded text-xs text-gray-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
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
        </div>

      {/* Payment Detail Modal */}
      <PaymentDetailModal
        isOpen={!!selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
        paymentId={selectedPaymentId}
      />
    </div>
  );
};

export default PaymentRegistrationsDashboard;

