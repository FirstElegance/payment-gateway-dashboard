import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { membersAPI } from '../services/api';
import { Search, Filter, X, ChevronLeft, ChevronRight, Users, Calendar } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-day-picker/style.css';
import MemberDetailModal from './MemberDetailModal';
import AppLoading from './AppLoading';

function parseLocalDate(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Members List Component
 * Component สำหรับแสดงรายการ Members
 */
const MembersList = () => {
  const [members, setMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
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
    loadMembers();
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

  // Load members data
  const loadMembers = async () => {
    try {
      if (allMembers.length === 0) {
        setLoading(true);
      }
      
      const response = await membersAPI.getAll();
      
      const membersArray = Array.isArray(response) ? response : [];

      setAllMembers(membersArray);
    } catch (err) {
      console.error('Error loading members:', err);
      if (allMembers.length === 0) {
        setAllMembers([]);
        setMembers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter members
  useEffect(() => {
    if (!Array.isArray(allMembers)) {
      setMembers([]);
      return;
    }

    const filtered = allMembers.filter((member) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          member.name?.toLowerCase().includes(searchLower) ||
          member.citizenId?.toLowerCase().includes(searchLower) ||
          member.memberId?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== 'all') {
        const memberStatus = member.accountStatus || '';
        if (memberStatus.toLowerCase() !== filters.status.toLowerCase()) return false;
      }

      if (filters.dateFrom || filters.dateTo) {
        const memberDate = new Date(member.createdAt);
        if (filters.dateFrom) {
          const fromDate = parseLocalDate(filters.dateFrom);
          if (fromDate && memberDate < fromDate) return false;
        }
        if (filters.dateTo) {
          const [y, m, day] = filters.dateTo.split('-').map(Number);
          const toDate = new Date(y, m - 1, day);
          toDate.setHours(23, 59, 59, 999);
          if (memberDate > toDate) return false;
        }
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const filteredTotal = sorted.length;
    const totalPages = Math.ceil(filteredTotal / pagination.limit) || 1;

    let currentPage = pagination.page;
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = 1;
      setPagination(prev => ({ ...prev, page: 1 }));
    }

    const start = (currentPage - 1) * pagination.limit;
    const end = start + pagination.limit;
    const paginated = sorted.slice(start, end);

    setMembers(paginated);

    // Update pagination total
    setPagination(prev => ({
      ...prev,
      total: filteredTotal,
      totalPages: totalPages,
    }));
  }, [allMembers, filters, pagination.page, pagination.limit]);

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
      case 'active':
        return 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30';
      case 'inactive':
      case 'suspended':
        return 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30';
      default:
        return 'bg-gray-100 dark:bg-slate-500/20 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-500/30';
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      dateFrom: '',
      dateTo: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.status !== 'all' ||
      filters.dateFrom ||
      filters.dateTo
    );
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-200 p-4 md:p-6 transition-colors">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Members</h1>
          <p className="text-gray-600 dark:text-slate-400 text-sm transition-colors">Manage and view member records</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-xl p-4 mb-6 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 w-4 h-4 z-10 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by Name, Citizen ID, Member ID..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-colors"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
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
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-slate-800 transition-colors">
              {/* Status Filter */}
              <div>
                <label className="block text-xs text-gray-600 dark:text-slate-400 mb-2 transition-colors">Account Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
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
          document.body, 'members-date-from-portal'
        )}
        {dateToPickerOpen && toPickerRect && createPortal(
          <div ref={toPickerRef} className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg p-3" style={{ top: toPickerRect.top, left: toPickerRect.left }}>
            <DayPicker mode="single" locale={enUS} selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
              onSelect={(date) => { const dateTo = date ? format(date, 'yyyy-MM-dd') : ''; setFilters((prev) => ({ ...prev, dateTo })); setDateToPickerOpen(false); setToPickerRect(null); }}
              disabled={(date) => { const from = parseLocalDate(filters.dateFrom); return from ? date < from : false; }}
              classNames={{ selected: 'bg-blue-500 text-white' }} />
          </div>,
          document.body, 'members-date-to-portal'
        )}

        {/* Table */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <AppLoading size="md" text="Loading..." />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400 transition-colors">
              No members found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 transition-colors">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">No.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">Citizen ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">Account Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">Created At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider">Updated At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 transition-colors">
                    {members.map((member, index) => {
                      const createdDateTime = formatDate(member.createdAt);
                      const updatedDateTime = formatDate(member.updatedAt);
                      const rowNum = (pagination.page - 1) * pagination.limit + index + 1;
                      return (
                        <tr
                          key={member.memberId}
                          className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedMemberId(member.memberId)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300 transition-colors">{rowNum}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="text-gray-900 dark:text-white transition-colors">{member.name || '-'}</div>
                            {/* <div className="text-xs text-gray-500 dark:text-slate-500 font-mono transition-colors">{member.memberId || ''}</div> */}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-mono text-gray-900 dark:text-white transition-colors">{member.citizenId || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(member.accountStatus)}`}>
                              {member.accountStatus || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="text-gray-700 dark:text-slate-300 transition-colors">{createdDateTime.date}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 font-mono transition-colors">{createdDateTime.time}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="text-gray-700 dark:text-slate-300 transition-colors">{updatedDateTime.date}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 font-mono transition-colors">{updatedDateTime.time}</div>
                          </td>
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
      <MemberDetailModal
        isOpen={!!selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
        memberId={selectedMemberId}
      />
    </div>
  );
};

export default MembersList;
