import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  LayoutGrid,
  RefreshCw,
  Search,
  Shield,
  Table2,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { portalBankingAPI } from '../services/api';
import AppLoading from './AppLoading';

const LAYOUT_STORAGE_KEY = 'elegance_portal_banking_layout';
const LAYOUT_OPTIONS = [
  { id: 'table', label: 'Table', icon: Table2 },
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
];

const EnvironmentBadge = ({ environment }) => {
  if (environment === 'PROD') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200/80 dark:ring-emerald-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Production
      </span>
    );
  }

  if (environment === 'SANDBOX' || environment === 'UAT') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200/80 dark:ring-amber-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Sandbox
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700">
      {environment || '—'}
    </span>
  );
};

const StatusBadge = ({ isActive }) => {
  const active = isActive !== false;

  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
      <XCircle className="w-3.5 h-3.5" />
      Inactive
    </span>
  );
};

const StatCard = ({ label, value, accent }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-sm">
    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {label}
    </p>
    <p className={`mt-1 text-2xl font-bold tabular-nums ${accent || 'text-slate-900 dark:text-white'}`}>
      {value}
    </p>
  </div>
);

const MerchantAvatar = ({ name, size = 'md' }) => {
  const initials = (name || '?').slice(0, 2).toUpperCase();
  const sizeClass = size === 'sm' ? 'w-9 h-9 text-xs rounded-lg' : 'w-10 h-10 text-sm rounded-xl';

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-white font-bold shadow-sm shadow-red-500/20 shrink-0 ${sizeClass}`}
    >
      {initials}
    </div>
  );
};

const OpenPortalButton = ({ inactive, isSelecting, onClick, fullWidth = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={inactive || isSelecting}
    className={`inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20 disabled:shadow-none disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 ${fullWidth ? 'w-full' : ''}`}
  >
    {isSelecting ? (
      <>
        <RefreshCw className="w-4 h-4 animate-spin" />
        Opening...
      </>
    ) : (
      <>
        Open Portal
        <ArrowRight className="w-4 h-4" />
      </>
    )}
  </button>
);

const LayoutSwitcher = ({ layout, onChange }) => (
  <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
    {LAYOUT_OPTIONS.map(({ id, label, icon: Icon }) => {
      const selected = layout === id;
      return (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          title={`${label} view`}
          className={`inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-md text-xs font-medium transition-all ${
            selected
              ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      );
    })}
  </div>
);

const PortalTableView = ({ portals, selectingId, onSelect }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden overflow-x-auto">
    <table className="w-full text-sm min-w-[640px]">
      <thead>
        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
          <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Merchant
          </th>
          <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Environment
          </th>
          <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Status
          </th>
          <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Action
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {portals.map((portal) => {
          const inactive = portal.isActive === false;
          const isSelecting = selectingId === portal.id;

          return (
            <tr
              key={portal.id}
              className={`transition-colors ${inactive ? 'opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <MerchantAvatar name={portal.merchant} />
                  <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
                    {portal.merchant || '—'}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4">
                <EnvironmentBadge environment={portal.environment} />
              </td>
              <td className="px-5 py-4">
                <StatusBadge isActive={portal.isActive} />
              </td>
              <td className="px-5 py-4 text-right">
                <OpenPortalButton
                  inactive={inactive}
                  isSelecting={isSelecting}
                  onClick={() => onSelect(portal)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const PortalGridView = ({ portals, selectingId, onSelect }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    {portals.map((portal) => {
      const inactive = portal.isActive === false;
      const isSelecting = selectingId === portal.id;

      return (
        <div
          key={portal.id}
          className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col ${inactive ? 'opacity-60' : 'hover:border-red-200 dark:hover:border-red-500/30 hover:shadow-md transition-all'}`}
        >
          <div className="flex items-start gap-3">
            <MerchantAvatar name={portal.merchant} />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide truncate">
                {portal.merchant || '—'}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <EnvironmentBadge environment={portal.environment} />
                <StatusBadge isActive={portal.isActive} />
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <OpenPortalButton
              inactive={inactive}
              isSelecting={isSelecting}
              onClick={() => onSelect(portal)}
              fullWidth
            />
          </div>
        </div>
      );
    })}
  </div>
);

/**
 * Portal Banking List
 * แสดงรายการ Portal Banking สำหรับ Super Admin
 */
const PortalBankingList = () => {
  const { isSuperAdmin, selectPortal, loading: authLoading } = useAuth();
  const [portals, setPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectingId, setSelectingId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [layout, setLayout] = useState(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      return LAYOUT_OPTIONS.some((opt) => opt.id === saved) ? saved : 'table';
    } catch {
      return 'table';
    }
  });

  const hasActiveFilters =
    searchTerm.trim() !== '' || environmentFilter !== 'all' || activeFilter !== 'all';

  const handleLayoutChange = (nextLayout) => {
    setLayout(nextLayout);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, nextLayout);
    } catch {
      /* ignore */
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setEnvironmentFilter('all');
    setActiveFilter('all');
  };

  const loadPortals = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadError(null);

      const data = await portalBankingAPI.getAll();
      const list = Array.isArray(data) ? data : [];
      const sorted = [...list].sort((a, b) =>
        (a.merchant || '').localeCompare(b.merchant || '', undefined, { sensitivity: 'base' }),
      );
      setPortals(sorted);
    } catch (err) {
      let errorMsg = err.message || err.response?.data?.message || 'Failed to load portal banking';

      if (err.status === 401) {
        errorMsg = 'Session expired. Please sign in again as Super Admin.';
      } else if (err.status === 403) {
        errorMsg = 'Access denied. Super-Admin role is required.';
      }

      setLoadError(errorMsg);
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

  const stats = useMemo(
    () => ({
      total: portals.length,
      active: portals.filter((p) => p.isActive !== false).length,
      prod: portals.filter((p) => p.environment === 'PROD').length,
      sandbox: portals.filter((p) => p.environment === 'SANDBOX' || p.environment === 'UAT').length,
    }),
    [portals],
  );

  const filteredPortals = useMemo(() => {
    return portals.filter((portal) => {
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchSearch =
          portal.merchant?.toLowerCase().includes(term) ||
          portal.environment?.toLowerCase().includes(term);
        if (!matchSearch) return false;
      }

      if (environmentFilter === 'SANDBOX') {
        if (portal.environment !== 'SANDBOX' && portal.environment !== 'UAT') {
          return false;
        }
      } else if (environmentFilter !== 'all' && portal.environment !== environmentFilter) {
        return false;
      }

      if (activeFilter === 'active' && portal.isActive === false) {
        return false;
      }

      if (activeFilter === 'inactive' && portal.isActive !== false) {
        return false;
      }

      return true;
    });
  }, [portals, searchTerm, environmentFilter, activeFilter]);

  const handleSelectPortal = (portal) => {
    setActionError(null);

    if (portal.isActive === false) {
      setActionError(`${portal.merchant || 'This merchant'} is currently inactive.`);
      return;
    }

    if (!portal?.vitePaymentUrl || !portal?.vitePaymentToken) {
      setActionError(`${portal.merchant || 'Merchant'} is missing connection credentials.`);
      return;
    }

    setSelectingId(portal.id);
    selectPortal(portal);
    window.location.href = '/';
  };

  const selectClass =
    'h-10 px-3 pr-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors appearance-none bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat';

  const chevronBg =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-6">
        <AppLoading size="lg" text="Loading merchants..." />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs font-semibold mb-3 ring-1 ring-red-100 dark:ring-red-500/20">
              <Shield className="w-3.5 h-3.5" />
              Super Admin Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Merchant Portals
            </h1>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              Select a merchant environment to access its payment gateway dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadPortals(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Merchants" value={stats.total} />
          <StatCard label="Active" value={stats.active} accent="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Production" value={stats.prod} accent="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="SANDBOX" value={stats.sandbox} accent="text-amber-600 dark:text-amber-400" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="relative lg:col-span-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search merchant..."
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors"
              />
            </div>

            <div className="lg:col-span-3">
              <select
                value={environmentFilter}
                onChange={(e) => setEnvironmentFilter(e.target.value)}
                className={`w-full ${selectClass}`}
                style={{ backgroundImage: chevronBg }}
              >
                <option value="all">All environments</option>
                <option value="PROD">Production</option>
                <option value="SANDBOX">Sandbox</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className={`w-full ${selectClass}`}
                style={{ backgroundImage: chevronBg }}
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>

            <div className="lg:col-span-1 flex items-center">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  title="Clear filters"
                  className="w-full h-10 inline-flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filteredPortals.length} of {portals.length} merchants shown
            </p>
            <LayoutSwitcher layout={layout} onChange={handleLayoutChange} />
          </div>
        </div>

        {loadError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/25">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">{loadError}</p>
              <button
                type="button"
                onClick={() => loadPortals()}
                className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {actionError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/25">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">{actionError}</p>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="p-1 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!loadError && filteredPortals.length > 0 && layout === 'table' && (
          <PortalTableView
            portals={filteredPortals}
            selectingId={selectingId}
            onSelect={handleSelectPortal}
          />
        )}

        {!loadError && filteredPortals.length > 0 && layout === 'grid' && (
          <PortalGridView
            portals={filteredPortals}
            selectingId={selectingId}
            onSelect={handleSelectPortal}
          />
        )}

        {!loadError && filteredPortals.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
              <Building2 className="w-7 h-7 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {hasActiveFilters ? 'No matching merchants' : 'No merchants configured'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {hasActiveFilters
                ? 'Try adjusting your search or filter criteria.'
                : 'Portal banking records will appear here once configured.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalBankingList;
