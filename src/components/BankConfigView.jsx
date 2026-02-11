import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bankConfigAPI } from '../services/api';
import AppLoading from './AppLoading';
import JsonEditor from './JsonEditor';
import { maskSensitiveInObject, formatJSON } from '../utils/jsonUtils';
import { SENSITIVE_FIELDS } from '../constants/bankConfig';
import { ArrowLeft, Edit, Copy, Download, AlertTriangle } from 'lucide-react';
import { toast } from '../utils/toast';

/**
 * Bank Config View Component
 * หน้าดูรายละเอียด Bank Config แบบ read-only
 * Features:
 * - Display all fields
 * - JSON formatted display
 * - Mask sensitive values
 * - Edit and Back buttons
 */
const BankConfigView = () => {
  const { bankCode, serviceCode } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maskedConfig, setMaskedConfig] = useState(null);

  useEffect(() => {
    if (bankCode && serviceCode) {
      loadConfig();
    }
  }, [bankCode, serviceCode]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bankConfigAPI.getOne(bankCode, serviceCode);
      setConfig(data);
      
      // Mask sensitive values for display
      const masked = maskSensitiveInObject(data.config, SENSITIVE_FIELDS);
      setMaskedConfig(masked);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load bank config');
      console.error('Error loading config:', err);
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
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  const handleCopy = async () => {
    if (!maskedConfig) return;
    try {
      const formatted = formatJSON(maskedConfig);
      await navigator.clipboard.writeText(formatted);
      toast.success('Configuration copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy configuration');
    }
  };

  const handleExport = () => {
    if (!maskedConfig) return;
    try {
      const formatted = formatJSON(maskedConfig);
      const blob = new Blob([formatted], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank-config-${bankCode}-${serviceCode}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Configuration exported successfully!');
    } catch (err) {
      console.error('Failed to export:', err);
      toast.error('Failed to export configuration');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <AppLoading size="lg" text="Loading configuration..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-red-300 dark:border-red-500/30 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">Error: {error}</p>
          <button
            onClick={() => navigate('/bank-configs')}
            className="mt-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-slate-700 text-sm transition"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg p-4">
          <p className="text-gray-600 dark:text-slate-400 text-sm">Configuration not found</p>
          <button
            onClick={() => navigate('/bank-configs')}
            className="mt-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-slate-700 text-sm transition"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg p-5 shadow-sm transition-colors">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/bank-configs')}
              className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-slate-800 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bank Configuration Details</h1>
              <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">{bankCode} / {serviceCode}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-slate-700 transition text-sm"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-slate-700 transition text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => navigate(`/bank-configs/edit/${bankCode}/${serviceCode}`)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-gray-900 dark:text-white rounded-lg shadow-lg shadow-red-600/20 transition text-sm"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg">
          <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 uppercase tracking-wider">ID</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">{config.id}</div>
        </div>
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg">
          <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Bank Code</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{config.bankCode}</div>
        </div>
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg">
          <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Service Code</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{config.serviceCode}</div>
        </div>
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg">
          <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Created At</div>
          <div className="text-sm text-gray-700 dark:text-slate-300 transition-colors">{formatDate(config.createdAt)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 p-4 rounded-lg">
          <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Updated At</div>
          <div className="text-sm text-gray-700 dark:text-slate-300 transition-colors">{formatDate(config.updatedAt)}</div>
        </div>
      </div>

      {/* Configuration JSON */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Configuration</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-400">
            <AlertTriangle className="w-3 h-3" />
            Sensitive values are masked
          </div>
        </div>
        
        {maskedConfig && (
          <div className="pt-2 pb-2">
            <JsonEditor
              value={maskedConfig}
              readOnly={true}
              height="600px"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BankConfigView;
