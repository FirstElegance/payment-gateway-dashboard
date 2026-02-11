import { useState, useEffect } from 'react';
import { bankRegistrationsAPI } from '../services/api';
import { X, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import JsonEditor from './JsonEditor';
import { maskSensitiveInObject, formatJSON } from '../utils/jsonUtils';
import { SENSITIVE_FIELDS } from '../constants/bankConfig';
import { toast } from '../utils/toast';
import AppLoading from './AppLoading';

/**
 * Bank Registration Detail Modal Component
 * Modal สำหรับแสดงรายละเอียด Bank Registration แบบเต็ม
 */
const BankRegistrationDetailModal = ({ 
  isOpen, 
  onClose, 
  registrationId,
}) => {
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [maskedRegistration, setMaskedRegistration] = useState(null);
  const [showJsonDetails, setShowJsonDetails] = useState(false);

  useEffect(() => {
    if (isOpen && registrationId) {
      loadRegistrationDetail();
    } else {
      // Reset state when modal closes
      setRegistration(null);
      setMaskedRegistration(null);
      setError(null);
      setShowJsonDetails(false);
    }
  }, [isOpen, registrationId]);

  const loadRegistrationDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bankRegistrationsAPI.getById(registrationId);
      
      setRegistration(data);
      
      // Mask sensitive values for display
      const masked = maskSensitiveInObject(data, SENSITIVE_FIELDS);
      setMaskedRegistration(masked);
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to load registration details');
      console.error('Error loading registration detail:', err);
    } finally {
      setLoading(false);
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

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const parseJSON = (jsonString) => {
    if (!jsonString) return null;
    try {
      // Remove leading/trailing quotes if present
      const cleaned = jsonString.trim().replace(/^["']|["']$/g, '');
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 transition-colors">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white transition-colors">Bank Registration Details</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 transition-colors">ID: {registrationId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <AppLoading size="sm" text="Loading..." />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}

          {registration && !loading && (
            <>
              {/* Basic Info */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 transition-colors">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slate-600 dark:text-slate-400 mb-1 transition-colors">Registration Reference</div>
                    <div className="text-slate-900 dark:text-white font-mono transition-colors">{registration.regRef || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Bank</div>
                    <div className="text-gray-900 dark:text-white transition-colors">{registration.bankName || '-'} ({registration.bankCode || '-'})</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Status</div>
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(registration.status).bg} ${getStatusColor(registration.status).text} ${getStatusColor(registration.status).border} border`}>
                      {registration.status || '-'}
                    </div>
                    {registration.statusDesc && (
                      <div className="text-gray-700 dark:text-slate-300 mt-1 text-xs transition-colors">{registration.statusDesc}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Member ID</div>
                    <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{registration.memberId || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Created At</div>
                    <div className="text-gray-900 dark:text-white transition-colors">{formatDate(registration.createdAt).date}</div>
                    <div className="text-gray-500 dark:text-slate-400 text-xs transition-colors">{formatDate(registration.createdAt).time}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Updated At</div>
                    <div className="text-gray-900 dark:text-white transition-colors">{formatDate(registration.updatedAt).date}</div>
                    <div className="text-gray-500 dark:text-slate-400 text-xs transition-colors">{formatDate(registration.updatedAt).time}</div>
                  </div>
                </div>
              </div>

              {/* Member Info */}
              {registration.member && (
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">Member Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Name</div>
                      <div className="text-gray-900 dark:text-white transition-colors">{registration.member.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Citizen ID</div>
                      <div className="text-gray-900 dark:text-white font-mono transition-colors">{registration.member.citizenId || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Account Status</div>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        registration.member.accountStatus === 'Active' 
                          ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30' 
                          : 'bg-gray-100 dark:bg-slate-500/20 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-500/30'
                      } border transition-colors`}>
                        {registration.member.accountStatus || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Accounts */}
              {registration.accounts && registration.accounts.length > 0 && (
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">Accounts</h4>
                  <div className="space-y-3">
                    {registration.accounts.map((account, idx) => (
                      <div key={account.id || idx} className="bg-white dark:bg-slate-900/50 p-3 rounded border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Account No.</div>
                            <div className="text-gray-900 dark:text-white font-mono transition-colors">{account.accountNo || '-'}</div>
                          </div>
                          <div>
                            <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Account Name</div>
                            <div className="text-gray-900 dark:text-white transition-colors">{account.accountName || '-'}</div>
                          </div>
                          {/* {account.espaId && (
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">ESPA ID</div>
                              <div className="text-gray-900 dark:text-white font-mono text-xs break-all transition-colors">{account.espaId}</div>
                            </div>
                          )} */}
                          <div>
                            <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Status</div>
                            <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              account.isActive 
                                ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30' 
                                : 'bg-gray-100 dark:bg-slate-500/20 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-500/30'
                            } border transition-colors`}>
                              {account.isActive ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Details JSON */}
              <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                <div className="flex justify-between items-center mb-4">
                    <button
                      onClick={() => setShowJsonDetails(!showJsonDetails)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {showJsonDetails ? (
                          <ChevronUp className="w-4 h-4" />
                      ) : (
                          <ChevronDown className="w-4 h-4" />
                      )}
                    View Full JSON Details
                    </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-slate-400 bg-yellow-500/20 px-2 py-1 rounded transition-colors">
                      Sensitive values masked
                    </span>
                    {maskedRegistration && (
                            <button
                        onClick={() => handleCopy(JSON.stringify(maskedRegistration || registration, null, 2))}
                        className="text-xs text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-slate-700/50 hover:bg-gray-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              Copy
                            </button>
                      )}
                    </div>
                </div>
                {showJsonDetails && maskedRegistration && (
                  <div className="pt-2 pb-2">
                <JsonEditor
                  value={formatJSON(maskedRegistration || registration)}
                  readOnly={true}
                      height="400px"
                />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BankRegistrationDetailModal;


