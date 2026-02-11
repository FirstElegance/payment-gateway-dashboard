import { useState, useEffect } from 'react';
import { paymentRegistrationsAPI } from '../services/api';
import AppLoading from './AppLoading';

/**
 * ELEGANCE PAYMENT List Component
 * หน้าแสดงรายการ ELEGANCE PAYMENT
 * Features:
 * - Table display
 * - Filter/Search
 * - ซ่อนฟิลด์ที่ sensitive (createdBy, updatedBy, deletedAt, requestBody, requestHeader, responseBody)
 */
const PaymentRegistrationsList = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [bankCodeFilter, setBankCodeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data
  useEffect(() => {
    loadPayments();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...payments];

    // Bank Code filter
    if (bankCodeFilter) {
      filtered = filtered.filter(payment => 
        payment.bankCode?.toLowerCase().includes(bankCodeFilter.toLowerCase()) ||
        payment.bankName?.toLowerCase().includes(bankCodeFilter.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(payment => 
        payment.status?.toLowerCase().includes(statusFilter.toLowerCase())
      );
    }

    // Search term (searches in ref, txnNumber, member name)
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
      const data = await paymentRegistrationsAPI.getAll();
      
      // ตรวจสอบว่า data เป็น array หรือไม่
      const paymentsArray = Array.isArray(data) ? data : [];
      
      if (!Array.isArray(data)) {
        console.warn('API response is not an array:', data);
      }
      
      setPayments(paymentsArray);
      setFilteredPayments(paymentsArray);
    } catch (err) {
      const errorMsg = err.message || err.response?.data?.message || 'Failed to load ELEGANCE PAYMENT';
      setError(errorMsg);
      console.error('Error loading payments:', err);
    } finally {
      setLoading(false);
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
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return '-';
    try {
      return parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch {
      return amount;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 dark:bg-slate-950 transition-colors">
        <div className="text-center">
          <AppLoading size="lg" text="Loading..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded transition-colors">
        <p className="text-red-700 dark:text-red-400 transition-colors">Error: {error}</p>
        <button
          onClick={loadPayments}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full bg-gray-50 dark:bg-slate-950 min-h-screen transition-colors">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">ELEGANCE PAYMENT</h1>
        <button
          onClick={loadPayments}
          className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-md border border-gray-300 dark:border-slate-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm p-4 rounded-lg shadow mb-6 border border-gray-200 dark:border-slate-800 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bank Code/Name Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">
              Bank
            </label>
            <input
              type="text"
              value={bankCodeFilter}
              onChange={(e) => setBankCodeFilter(e.target.value)}
              placeholder="Filter by bank code or name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">
              Status
            </label>
            <input
              type="text"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              placeholder="Filter by status..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ref, txn number, member name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {(bankCodeFilter || statusFilter || searchTerm) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setBankCodeFilter('');
                setStatusFilter('');
                setSearchTerm('');
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600 dark:text-slate-400 transition-colors">
        Showing {filteredPayments.length} of {payments.length} ELEGANCE PAYMENT
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm rounded-lg shadow overflow-hidden border border-gray-200 dark:border-slate-800 transition-colors">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-800/50 transition-colors">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                  Bank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                  Ref / Txn Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                  Updated At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900/50 divide-y divide-gray-200 dark:divide-slate-700 transition-colors">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-slate-400 transition-colors">
                    No ELEGANCE PAYMENT found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-300 transition-colors">
                      {payment.id?.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white transition-colors">{payment.bankName}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400 transition-colors">{payment.bankCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white transition-colors">{payment.ref}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400 transition-colors">{payment.txnNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white transition-colors">
                      {formatAmount(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                      {payment.statusCode && (
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 transition-colors">Code: {payment.statusCode}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white transition-colors">{payment.member?.name || '-'}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400 transition-colors">
                        {payment.member?.citizenId ? `ID: ${payment.member.citizenId}` : ''}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-slate-500 transition-colors">
                        {payment.member?.accountStatus || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 transition-colors">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400 transition-colors">
                      {formatDate(payment.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentRegistrationsList;







