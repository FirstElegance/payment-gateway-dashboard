import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { bankRegistrationsAPI, transferConfigAPI } from '../services/api';
import { Search, Filter, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-day-picker/style.css';
import BankRegistrationDetailModal from './BankRegistrationDetailModal';
import AppLoading from './AppLoading';

function parseLocalDate(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Bank Registrations List Component
 * Component สำหรับแสดงรายการ Bank Registrations
 */
const BankRegistrationsList = () => {
  const [registrations, setRegistrations] = useState([]);
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [bankList, setBankList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedRegistrationId, setSelectedRegistrationId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    bank: 'all',
    dateFrom: '',
    dateTo: '',
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

  useEffect(() => {
    loadBankList();
    loadRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showFilters) {
      setDateFromPickerOpen(false);
      setDateToPickerOpen(false);
      setFromPickerRect(null);
      setToPickerRect(null);
    }
  }, [showFilters]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (datePickerRef.current?.contains(e.target) || fromPickerRef.current?.contains(e.target) || toPickerRef.current?.contains(e.target)) return;
      setDateFromPickerOpen(false);
      setDateToPickerOpen(false);
      setFromPickerRect(null);
      setToPickerRect(null);
    };
    if (dateFromPickerOpen || dateToPickerOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dateFromPickerOpen, dateToPickerOpen]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.status, filters.bank, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    if (!Array.isArray(allRegistrations)) return;
    const limit = pagination.limit;
    const page = pagination.page;
    const f = filters;
    const filtered = allRegistrations.filter((r) => {
      if (f.search) {
        const s = f.search.toLowerCase();
        const match = (r.regRef || '').toLowerCase().includes(s) || (r.member?.name || '').toLowerCase().includes(s) || (r.member?.citizenId || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (f.status !== 'all') {
        if ((r.status || '').toUpperCase() !== f.status) return false;
      }
      if (f.bank !== 'all') {
        if ((r.bankCode || '') !== f.bank) return false;
      }
      const d = new Date(r.createdAt);
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
      return true;
    });
    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * limit;
    setRegistrations(sorted.slice(start, start + limit));
    setPagination((prev) => ({ ...prev, total, totalPages, page: safePage }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRegistrations, filters.search, filters.status, filters.bank, filters.dateFrom, filters.dateTo, pagination.page, pagination.limit]);

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

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await bankRegistrationsAPI.getAll(1, 5000, {});
      const registrationsArray = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      console.log('📊 Bank Registrations loaded:', registrationsArray.length, 'records (client-side filter + paginate)');
      setAllRegistrations(registrationsArray);
    } catch (err) {
      console.error('Error loading registrations:', err);
      setAllRegistrations([]);
      setRegistrations([]);
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
    setFilters({ search: '', status: 'all', bank: 'all', dateFrom: '', dateTo: '' });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.status !== 'all' ||
      filters.bank !== 'all' ||
      filters.dateFrom ||
      filters.dateTo
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Bank Registrations</h1>
          <p className="text-gray-600 dark:text-slate-400 text-sm transition-colors">Manage and view bank registration records</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-xl p-4 mb-6 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 w-4 h-4 z-10 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by Ref, Member Name, Citizen ID..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-colors"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                title={showFilters ? 'Hide filters' : 'Show filters'}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  showFilters || hasActiveFilters()
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters() && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/90 dark:bg-white/20 rounded text-xs text-gray-900 dark:text-white transition-colors">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-slate-800 transition-colors">
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

              {/* Date Range - react-day-picker (en-US) */}
              <div className="flex gap-2 items-end overflow-visible" ref={datePickerRef}>
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
                        } else setFromPickerRect(null);
                        setDateFromPickerOpen((v) => !v);
                      }}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors text-left"
                    >
                      <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400" />
                      <span className="pl-6 block truncate">{filters.dateFrom || 'Start Date'}</span>
                    </button>
                  </div>
                </div>
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
                        } else setToPickerRect(null);
                        setDateToPickerOpen((v) => !v);
                      }}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors text-left"
                    >
                      <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-slate-400" />
                      <span className="pl-6 block truncate">{filters.dateTo || 'End Date'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {dateFromPickerOpen && fromPickerRect && createPortal(
          <div ref={fromPickerRef} className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3" style={{ top: fromPickerRect.top, left: fromPickerRect.left }}>
            <DayPicker mode="single" locale={enUS} selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
              onSelect={(date) => { const dateFrom = date ? format(date, 'yyyy-MM-dd') : ''; setFilters((prev) => ({ ...prev, dateFrom })); setDateFromPickerOpen(false); setFromPickerRect(null); }}
              disabled={(date) => { const to = parseLocalDate(filters.dateTo); return to ? date > to : false; }}
              classNames={{ selected: 'bg-blue-500 text-white' }} />
          </div>,
          document.body, 'br-date-from-portal'
        )}
        {dateToPickerOpen && toPickerRect && createPortal(
          <div ref={toPickerRef} className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3" style={{ top: toPickerRect.top, left: toPickerRect.left }}>
            <DayPicker mode="single" locale={enUS} selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
              onSelect={(date) => { const dateTo = date ? format(date, 'yyyy-MM-dd') : ''; setFilters((prev) => ({ ...prev, dateTo })); setDateToPickerOpen(false); setToPickerRect(null); }}
              disabled={(date) => { const from = parseLocalDate(filters.dateFrom); return from ? date < from : false; }}
              classNames={{ selected: 'bg-blue-500 text-white' }} />
          </div>,
          document.body, 'br-date-to-portal'
        )}

        {/* Table */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <AppLoading size="md" text="Loading..." />
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400 transition-colors">
              No registrations found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 transition-colors">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">No.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">Reg Ref</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">Bank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">Member</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 transition-colors">
                    {registrations.map((reg, index) => {
                      const dateTime = formatDate(reg.createdAt);
                      const rowNum = (pagination.page - 1) * pagination.limit + index + 1;
                      return (
                        <tr
                          key={reg.id}
                          className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedRegistrationId(reg.id)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300 transition-colors">{rowNum}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-mono text-gray-900 dark:text-white transition-colors">{reg.regRef || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white transition-colors">{reg.bankName || '-'}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-500 transition-colors">{reg.bankCode || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white transition-colors">{reg.member?.name || '-'}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-500 font-mono transition-colors">{reg.member?.citizenId || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(reg.status)}`}>
                              {reg.status || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300 transition-colors">{dateTime.date}</td>
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
      <BankRegistrationDetailModal
        isOpen={!!selectedRegistrationId}
        onClose={() => setSelectedRegistrationId(null)}
        registrationId={selectedRegistrationId}
      />
    </div>
  );
};

export default BankRegistrationsList;

