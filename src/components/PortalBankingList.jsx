import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  ChevronRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { portalBankingAPI } from '../services/api';
import AppLoading from './AppLoading';

/**
 * Portal Banking List
 * แสดงรายการ Portal Banking แบบ card ตาม merchant
 */
const PortalBankingList = () => {
  const { isSuperAdmin, selectPortal, loading: authLoading } = useAuth();
  const [portals, setPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectingId, setSelectingId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadPortals = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await portalBankingAPI.getAll();
      const list = Array.isArray(data) ? data : [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0),
      );
      setPortals(sorted);
    } catch (err) {
      let errorMsg = err.message || err.response?.data?.message || 'Failed to load portal banking';

      if (err.status === 401) {
        errorMsg = 'Unauthorized. Please sign in again as Super Admin.';
      } else if (err.status === 403) {
        errorMsg = 'Forbidden. Super-Admin role is required to access portal banking.';
      }

      setError(errorMsg);
      console.error('Error loading portal banking:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isSuperAdmin) return;
    loadPortals();
  }, [authLoading, isSuperAdmin]);

  const filteredPortals = useMemo(() => {
    if (!searchTerm.trim()) return portals;

    const term = searchTerm.trim().toLowerCase();
    return portals.filter((portal) =>
      portal.merchant?.toLowerCase().includes(term),
    );
  }, [portals, searchTerm]);

  const handleSelectPortal = (portal) => {
    if (!portal?.vitePaymentUrl || !portal?.vitePaymentToken) {
      setError('This merchant is missing payment URL or token.');
      return;
    }

    setSelectingId(portal.id);
    selectPortal(portal);
    window.location.href = '/';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 dark:bg-slate-950 p-3 sm:p-4 md:p-6 transition-colors">
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg p-10 flex items-center justify-center shadow-sm transition-colors">
          <AppLoading size="lg" text="Loading portal banking..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-200 p-3 sm:p-4 md:p-6 transition-colors">
      <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-4 sm:p-6 transition-colors">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white transition-colors">
              Portal Banking
            </h1>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1 transition-colors">
              Select a merchant to open the payment gateway portal
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadPortals(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by merchant..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-3 transition-colors">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 dark:text-red-300 transition-colors">{error}</p>
            <button
              type="button"
              onClick={() => loadPortals()}
              className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!error && filteredPortals.length === 0 && (
        <div className="bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-lg p-10 text-center shadow-sm transition-colors">
          <Building2 className="w-10 h-10 text-gray-400 dark:text-slate-500 mx-auto mb-3" />
          <p className="text-gray-700 dark:text-slate-300 font-medium transition-colors">
            {searchTerm ? 'No merchants match your search' : 'No portal banking records found'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPortals.map((portal) => (
          <button
            key={portal.id}
            type="button"
            onClick={() => handleSelectPortal(portal)}
            disabled={selectingId === portal.id}
            className="group bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm hover:shadow-md hover:border-red-300 dark:hover:border-red-500/40 transition-all p-5 sm:p-6 text-left disabled:opacity-60 disabled:cursor-wait"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-500/20 shrink-0">
                <Building2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 dark:text-slate-600 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors shrink-0 mt-0.5" />
            </div>

            <h2 className="mt-4 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white uppercase break-all transition-colors">
              {portal.merchant || '-'}
            </h2>

            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 transition-colors">
              Click to open portal
            </p>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
};

export default PortalBankingList;
