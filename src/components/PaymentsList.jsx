import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { paymentRegistrationsAPI, transferConfigAPI } from '../services/api';
import { Search, Filter, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-day-picker/style.css';
import PaymentDetailModal from './PaymentDetailModal';
import AppLoading from './AppLoading';

/** Parse YYYY-MM-DD as local midnight (avoids UTC timezone offset when comparing dates). */
function parseLocalDate(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Payments List Component
 * Component สำหรับแสดงรายการ Payments
 */
const PaymentsList = () => {
  const [payments, setPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [bankList, setBankList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
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
  const [dateFromPickerOpen, setDateFromPickerOpen] = useState(false);
  const [dateToPickerOpen, setDateToPickerOpen] = useState(false);
  const [fromPickerRect, setFromPickerRect] = useState(null);
  const [toPickerRect, setToPickerRect] = useState(null);
  const datePickerRef = useRef(null);
  const fromBtnRef = useRef(null);
  const toBtnRef = useRef(null);
  const fromPickerRef = useRef(null);
  const toPickerRef = useRef(null);

  // Load initial data
  useEffect(() => {
    loadBankList();
    loadPayments();
  }, []);
  
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.bank, filters.status, filters.search, filters.dateFrom, filters.dateTo, filters.amountMin, filters.amountMax]);

  useEffect(() => {
    if (!Array.isArray(allPayments)) return;
    const limit = pagination.limit;
    const page = pagination.page;
    const f = filters;
    const filtered = allPayments.filter((p) => {
      if (f.search) {
        const s = f.search.toLowerCase();
        const match = (p.ref || '').toLowerCase().includes(s) || (p.ref1 || '').toLowerCase().includes(s) || (p.txnNumber || '').toLowerCase().includes(s) || (p.member?.name || '').toLowerCase().includes(s) || (p.member?.citizenId || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (f.status !== 'all') {
        if ((p.status || '').toUpperCase() !== f.status) return false;
      }
      if (f.bank !== 'all') {
        if ((p.bankCode || '') !== f.bank) return false;
      }
      const d = new Date(p.createdAt);
      if (f.dateFrom) {
        const from = parseLocalDate(f.dateFrom);
        if (from && d < from) return false;
      }
      if (f.dateTo) {
        const [y, m, day] = f.dateTo.split('-').map(Number);
        const to = new Date(y, m - 1, day);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      const amount = parseFloat(p.amount) || 0;
      if (f.amountMin && amount < Number(f.amountMin)) return false;
      if (f.amountMax && amount > Number(f.amountMax)) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * limit;
    setPayments(sorted.slice(start, start + limit));
    setPagination((prev) => ({ ...prev, total, totalPages, page: safePage }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPayments, filters.bank, filters.status, filters.search, filters.dateFrom, filters.dateTo, filters.amountMin, filters.amountMax, pagination.page, pagination.limit]);

  // Close date pickers when filters panel is collapsed
  useEffect(() => {
    if (!showFilters) {
      setDateFromPickerOpen(false);
      setDateToPickerOpen(false);
      setFromPickerRect(null);
      setToPickerRect(null);
    }
  }, [showFilters]);

  // Handle click outside date pickers to close them (including portal dropdowns)
  useEffect(() => {
    const handleClickOutside = (event) => {
      const inButtons = datePickerRef.current?.contains(event.target);
      const inFromPicker = fromPickerRef.current?.contains(event.target);
      const inToPicker = toPickerRef.current?.contains(event.target);
      if (inButtons || inFromPicker || inToPicker) return;
      setDateFromPickerOpen(false);
      setDateToPickerOpen(false);
      setFromPickerRect(null);
      setToPickerRect(null);
    };

    if (dateFromPickerOpen || dateToPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dateFromPickerOpen, dateToPickerOpen]);

  // Load bank list
  const loadBankList = async () => {
    try {
      const banks = await transferConfigAPI.getBankList(true);
      setBankList(banks);
    } catch (err) {
      console.error('Error loading bank list:', err);
      setBankList([]);
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentRegistrationsAPI.getAll(1, 5000, {});
      const paymentsArray = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      console.log('📊 Payments loaded:', paymentsArray.length, 'records (client-side filter + paginate)');
      setAllPayments(paymentsArray);
    } catch (err) {
      console.error('Error loading payments:', err);
      setAllPayments([]);
      setPayments([]);
    } finally {
      setLoading(false);
      setHasInitialLoad(true);
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
      case 'failed':
      case 'error':
        return 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30';
      case 'pending':
        return 'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30';
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

  console.log('PaymentsList: Render', { loading, paymentsCount: payments.length, allPaymentsCount: allPayments.length });

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-200 p-4 md:p-6 transition-colors">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Payments</h1>
          <p className="text-gray-600 dark:text-slate-400 text-sm transition-colors">Manage and view payment transactions</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-xl p-4 mb-6 shadow-sm transition-colors overflow-visible">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 w-4 h-4 z-10 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by Ref, Trans ID, Member Name, Citizen ID..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200 dark:border-slate-800 transition-colors overflow-visible">
              {/* Status Filter */}
              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2 transition-colors">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="SUCCESS">Success</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              {/* Bank Filter */}
              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2 transition-colors">Bank</label>
                <select
                  value={filters.bank}
                  onChange={(e) => setFilters((prev) => ({ ...prev, bank: e.target.value }))}
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

              {/* Date Range - horizontal layout */}
              <div className="flex gap-2 items-end overflow-visible" ref={datePickerRef}>
                {/* Start Date (From) */}
                <div className="relative flex-1">
                  <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2 transition-colors">Start Date</label>
                  <div className="relative">
                    <button
                      ref={fromBtnRef}
                      type="button"
                      onClick={() => {
                        setDateToPickerOpen(false);
                        setToPickerRect(null);
                        if (!dateFromPickerOpen && fromBtnRef.current) {
                          const rect = fromBtnRef.current.getBoundingClientRect();
                          setFromPickerRect({ top: rect.bottom + 4, left: rect.left });
                        } else {
                          setFromPickerRect(null);
                        }
                        setDateFromPickerOpen((v) => !v);
                      }}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors text-left"
                    >
                      <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400" />
                      <span className="pl-6 block truncate">
                        {filters.dateFrom || 'Start Date'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* End Date (To) */}
                <div className="relative flex-1">
                  <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2 transition-colors">End Date</label>
                  <div className="relative">
                    <button
                      ref={toBtnRef}
                      type="button"
                      onClick={() => {
                        setDateFromPickerOpen(false);
                        setFromPickerRect(null);
                        if (!dateToPickerOpen && toBtnRef.current) {
                          const rect = toBtnRef.current.getBoundingClientRect();
                          setToPickerRect({ top: rect.bottom + 4, left: rect.left });
                        } else {
                          setToPickerRect(null);
                        }
                        setDateToPickerOpen((v) => !v);
                      }}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors text-left"
                    >
                      <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400" />
                      <span className="pl-6 block truncate">
                        {filters.dateTo || 'End Date'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Portals: date pickers rendered in body so they overlay table */}
              {dateFromPickerOpen &&
                fromPickerRect &&
                createPortal(
                  <div
                    ref={fromPickerRef}
                    className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3"
                    style={{ top: fromPickerRect.top, left: fromPickerRect.left }}
                  >
                    <DayPicker
                      mode="single"
                      locale={enUS}
                      selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                      onSelect={(date) => {
                        const dateFrom = date ? format(date, 'yyyy-MM-dd') : '';
                        setFilters((prev) => ({ ...prev, dateFrom }));
                        setDateFromPickerOpen(false);
                        setFromPickerRect(null);
                      }}
                      disabled={(date) => {
                        const to = parseLocalDate(filters.dateTo);
                        if (to) return date > to;
                        return false;
                      }}
                      classNames={{ selected: 'bg-blue-500 text-white' }}
                    />
                  </div>,
                  document.body,
                  'payments-date-from-portal'
                )}
              {dateToPickerOpen &&
                toPickerRect &&
                createPortal(
                  <div
                    ref={toPickerRef}
                    className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3"
                    style={{ top: toPickerRect.top, left: toPickerRect.left }}
                  >
                    <DayPicker
                      mode="single"
                      locale={enUS}
                      selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                      onSelect={(date) => {
                        const dateTo = date ? format(date, 'yyyy-MM-dd') : '';
                        setFilters((prev) => ({ ...prev, dateTo }));
                        setDateToPickerOpen(false);
                        setToPickerRect(null);
                      }}
                      disabled={(date) => {
                        const from = parseLocalDate(filters.dateFrom);
                        if (from) return date < from;
                        return false;
                      }}
                      classNames={{ selected: 'bg-blue-500 text-white' }}
                    />
                  </div>,
                  document.body,
                  'payments-date-to-portal'
                )}

              {/* Amount Range */}
              {/*  */}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <AppLoading size="md" text="Loading..." />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400 transition-colors">
              No payments found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 transition-colors">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider transition-colors">No.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider transition-colors">Ref</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider transition-colors">Trans ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider transition-colors">Bank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider transition-colors">Member</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider transition-colors">Amount</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider transition-colors">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider transition-colors w-32">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider transition-colors">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 transition-colors">
                    {payments.map((payment, index) => {
                      const dateTime = formatDate(payment.createdAt);
                      const rowNum = (pagination.page - 1) * pagination.limit + index + 1;
                      return (
                        <tr
                          key={payment.id}
                          className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedPaymentId(payment.id)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300 transition-colors">{rowNum}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white transition-colors">{payment.ref || payment.ref1 || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{payment.txnNumber || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white transition-colors">{payment.bankName || '-'}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-500 transition-colors">{payment.bankCode || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white transition-colors">{payment.member?.name || '-'}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-500 font-mono transition-colors">{payment.member?.citizenId || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <div className="text-gray-900 dark:text-white font-bold font-mono transition-colors">{formatThaiBaht(payment.amount)}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(payment.status)}`}>
                              {payment.status || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300 transition-colors whitespace-nowrap">{dateTime.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400 font-mono transition-colors">{dateTime.time}</td>
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
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <PaymentDetailModal
        isOpen={!!selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
        paymentId={selectedPaymentId}
      />
    </div>
  );
};

export default PaymentsList;

