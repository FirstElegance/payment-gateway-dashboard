import { useState, useEffect } from 'react';
import { qrPaymentAPI, transferConfigAPI } from '../services/api';
import { Search, Filter, X, ChevronLeft, ChevronRight, QrCode } from 'lucide-react';
import QrPaymentDetailModal from './QrPaymentDetailModal';
import AppLoading from './AppLoading';

/**
 * QR Payments List Component
 * Component สำหรับแสดงรายการ QR Payments
 */
const QrPaymentsList = () => {
  const [qrPayments, setQrPayments] = useState([]);
  const [allQrPayments, setAllQrPayments] = useState([]);
  const [bankList, setBankList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedQrPaymentId, setSelectedQrPaymentId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    bank: 'all',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
  });

  // Load initial data
  useEffect(() => {
    loadBankList();
    loadQrPayments();
  }, []);

  // Load bank list
  const loadBankList = async () => {
    try {
      const banks = await transferConfigAPI.getBankList();
      setBankList(banks);
    } catch (err) {
      console.error('Error loading bank list:', err);
      setBankList([]);
    }
  };

  // Load QR payments data
  const loadQrPayments = async () => {
    try {
      // Only show loading if switching to this tab for the first time
      if (allQrPayments.length === 0) {
        setLoading(true);
      }
      
      // Always load all data (1000 limit) to ensure we have complete dataset for filtering
      const limit = 1000; // Always load all
      const page = 1;
      
      const response = await qrPaymentAPI.getAll(page, limit);
      
      const qrPaymentsArray = Array.isArray(response?.data) 
        ? response.data 
        : Array.isArray(response) 
          ? response 
          : [];

      setAllQrPayments(qrPaymentsArray);
      // Don't set qrPayments here - it will be set by the filter useEffect

      // Note: totalPages will be calculated based on filtered data
    } catch (err) {
      console.error('Error loading QR payments:', err);
      // Don't crash the app
      if (allQrPayments.length === 0) {
        setAllQrPayments([]);
        setQrPayments([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter QR payments
  useEffect(() => {
    if (!Array.isArray(allQrPayments)) {
      setQrPayments([]);
      return;
    }

    const filtered = allQrPayments.filter((qrPayment) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          qrPayment.ref1?.toLowerCase().includes(searchLower) ||
          qrPayment.ref2?.toLowerCase().includes(searchLower) ||
          qrPayment.internalRef?.toLowerCase().includes(searchLower) ||
          qrPayment.serviceCode?.toLowerCase().includes(searchLower) ||
          qrPayment.id?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        const status = qrPayment.status || '';
        if (status?.toLowerCase() !== filters.status.toLowerCase()) return false;
      }

      // Bank filter
      if (filters.bank !== 'all') {
        const qrPaymentBankCode = String(qrPayment.bankCode || '').trim();
        const filterBankCode = String(filters.bank || '').trim();
        if (qrPaymentBankCode !== filterBankCode) return false;
      }

      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        const qrPaymentDate = new Date(qrPayment.createdAt);
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (qrPaymentDate < fromDate) return false;
        }
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (qrPaymentDate > toDate) return false;
        }
      }

      // Amount range filter
      if (filters.amountMin || filters.amountMax) {
        const amount = Number(qrPayment.amountInBaht) || 0;
        if (filters.amountMin && amount < Number(filters.amountMin)) return false;
        if (filters.amountMax && amount > Number(filters.amountMax)) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const filteredTotal = sorted.length;
    const totalPages = Math.ceil(filteredTotal / pagination.limit);

    let currentPage = pagination.page;
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = 1;
      setPagination(prev => ({ ...prev, page: 1 }));
    }

    const start = (currentPage - 1) * pagination.limit;
    const end = start + pagination.limit;
    const paginated = sorted.slice(start, end);

    setQrPayments(paginated);

    // Update pagination total
    setPagination(prev => ({
      ...prev,
      total: filteredTotal,
      totalPages: totalPages,
    }));
  }, [allQrPayments, filters, pagination.page, pagination.limit]);

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

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'GENERATED':
        return 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
      case 'USED':
        return 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
      default:
        return 'bg-gray-100 dark:bg-slate-500/20 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-500/30';
    }
  };

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
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.status !== 'all' ||
      filters.bank !== 'all' ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.amountMin ||
      filters.amountMax
    );
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-200 p-4 md:p-6 transition-colors">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors flex items-center gap-2">
            <QrCode className="w-6 h-6" />
            QR Payments
          </h1>
          <p className="text-gray-600 dark:text-slate-400 text-sm transition-colors">Manage and view QR payment transactions</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-xl p-4 mb-6 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 w-4 h-4 z-10 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by Ref1, Ref2, Internal Ref, Service Code..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-colors"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                title={showFilters ? 'Hide filters' : 'Show filters'}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  showFilters || hasActiveFilters()
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters() && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    {Object.values(filters).filter(v => v && v !== 'all').length}
                  </span>
                )}
              </button>
              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  title="Clear all filters"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200 dark:border-slate-800 transition-colors">
              {/* Status Filter */}
              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2 transition-colors">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="generated">GENERATED</option>
                  <option value="used">USED</option>
                </select>
              </div>

              {/* Bank Filter */}
              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2 transition-colors">Bank</label>
                <select
                  value={filters.bank}
                  onChange={(e) => setFilters(prev => ({ ...prev, bank: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                >
                  <option value="all">All Banks</option>
                  {bankList.map((bank) => (
                    <option key={bank.bankCode} value={bank.bankCode}>
                      {bank.bankNameThai || bank.bankNameEng || bank.bankName} ({bank.bankCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2 transition-colors">Start Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2 transition-colors">End Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value, page: 1 }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                />
              </div>

              {/* Amount Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2 transition-colors">Min Amount</label>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.amountMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, amountMin: e.target.value, page: 1 }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2 transition-colors">Max Amount</label>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.amountMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value, page: 1 }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <AppLoading size="md" text="Loading..." />
            </div>
          ) : qrPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400 transition-colors">
              No QR payments found
            </div>
          ) : (
            <>
              <div>
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 transition-colors">
                    <tr>
                      <th style={{width: '3%'}} className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap transition-colors">No.</th>
                      <th style={{width: '13%'}} className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap transition-colors">Ref1</th>
                      <th style={{width: '13%'}} className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap transition-colors">Ref2</th>
                      <th style={{width: '13%'}} className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap transition-colors">Internal Ref</th>
                      <th style={{width: '9%'}} className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap transition-colors">Service Code</th>
                      <th style={{width: '9%'}} className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap transition-colors">Bank Code</th>
                      <th style={{width: '10%'}} className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap transition-colors">Amount</th>
                      <th style={{width: '10%'}} className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap transition-colors">Status</th>
                      <th style={{width: '10%'}} className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap transition-colors">Date</th>
                      <th style={{width: '10%'}} className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap transition-colors">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 transition-colors">
                    {qrPayments.map((qrPayment, index) => {
                      const dateTime = formatDate(qrPayment.createdAt);
                      const rowNum = (pagination.page - 1) * pagination.limit + index + 1;
                      return (
                        <tr
                          key={qrPayment.id}
                          className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedQrPaymentId(qrPayment.id)}
                        >
                          <td className="px-3 py-3 text-sm text-gray-700 dark:text-slate-300 transition-colors">{rowNum}</td>
                          <td className="px-3 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white font-mono text-xs truncate transition-colors" title={qrPayment.ref1}>{qrPayment.ref1 || '-'}</div>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white font-mono text-xs truncate transition-colors" title={qrPayment.ref2}>{qrPayment.ref2 || '-'}</div>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white font-mono text-xs truncate transition-colors" title={qrPayment.internalRef}>{qrPayment.internalRef || '-'}</div>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white text-xs truncate transition-colors" title={qrPayment.serviceCode}>{qrPayment.serviceCode || '-'}</div>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{qrPayment.bankCode || '-'}</div>
                          </td>
                          <td className="px-3 py-3 text-sm text-left">
                            <div className="text-gray-900 dark:text-white font-bold font-mono whitespace-nowrap transition-colors">{formatThaiBaht(qrPayment.amountInBaht)}</div>
                          </td>
                          <td className="px-3 py-3 text-sm text-left">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium border whitespace-nowrap ${getStatusColor(qrPayment.status)}`}>
                              {qrPayment.status || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap transition-colors">{dateTime.date}</td>
                          <td className="px-3 py-3 text-sm text-gray-600 dark:text-slate-400 font-mono whitespace-nowrap transition-colors">{dateTime.time}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="px-4 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30 flex items-center justify-between transition-colors">
                  <div className="text-sm text-gray-600 dark:text-slate-400 transition-colors">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </div>
                  {pagination.totalPages > 1 && (
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
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <QrPaymentDetailModal
        isOpen={!!selectedQrPaymentId}
        onClose={() => setSelectedQrPaymentId(null)}
        qrPaymentId={selectedQrPaymentId}
      />
    </div>
  );
};

export default QrPaymentsList;
