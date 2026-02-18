import { useState, useEffect } from 'react';
import { fundTransfersAPI } from '../services/api';
import { X, Copy, Download, ChevronDown, ChevronUp } from 'lucide-react';
import JsonEditor from './JsonEditor';
import AppLoading from './AppLoading';
import { maskSensitiveInObject, formatJSON } from '../utils/jsonUtils';
import { SENSITIVE_FIELDS } from '../constants/bankConfig';
import { getBankDisplay } from '../utils/bankUtils';

/**
 * Fund Transfer Detail Modal Component
 * Modal สำหรับแสดงรายละเอียด Fund Transfer แบบเต็ม
 */
const FundTransferDetailModal = ({ 
  isOpen, 
  onClose, 
  fundTransferId,
}) => {
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [maskedTransfer, setMaskedTransfer] = useState(null);
  const [showJsonDetails, setShowJsonDetails] = useState(false);

  useEffect(() => {
    if (isOpen && fundTransferId) {
      loadFundTransferDetail();
    } else {
      setTransfer(null);
      setMaskedTransfer(null);
      setError(null);
      setShowJsonDetails(false);
    }
  }, [isOpen, fundTransferId]);

  const loadFundTransferDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading fund transfer detail for ID:', fundTransferId);
      const data = await fundTransfersAPI.getById(fundTransferId);
      console.log('Fund transfer data:', data);
      setTransfer(data);
      
      // Mask sensitive data
      const masked = maskSensitiveInObject(data, SENSITIVE_FIELDS);
      setMaskedTransfer(masked);
    } catch (err) {
      console.error('Error loading fund transfer detail:', err);
      const errorMsg = err.message || err.response?.data?.message || 'Failed to load fund transfer details';
      setError(errorMsg);
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

  const formatThaiBaht = (amount) => {
    if (!amount) return '฿0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `฿${numAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCopy = () => {
    if (maskedTransfer) {
      navigator.clipboard.writeText(formatJSON(maskedTransfer));
    }
  };

  const handleExport = () => {
    if (maskedTransfer) {
      const dataStr = formatJSON(maskedTransfer);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fund-transfer-${fundTransferId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md transition-colors">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center transition-colors">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white transition-colors">Fund Transfer Details</h2>
          <button
            onClick={onClose}
            title="Close"
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400 transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="flex justify-center py-8">
              <AppLoading size="sm" text="Loading..." />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg p-4 text-red-700 dark:text-red-400 transition-colors">
              {error}
            </div>
          )}

          {transfer && !loading && (
            <>
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                  <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Merchant ID</div>
                  <div className="text-sm font-mono text-gray-900 dark:text-white transition-colors">{transfer.merchantID || '-'}</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Merchant Trans ID</div>
                  <div className="text-sm font-mono text-gray-900 dark:text-white transition-colors">{transfer.merchantTransID || '-'}</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">RS Trans ID</div>
                  <div className="text-sm font-mono text-gray-900 dark:text-white transition-colors">{transfer.rsTransID || '-'}</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Amount</div>
                  <div className="text-lg font-bold font-mono text-gray-900 dark:text-white transition-colors">{formatThaiBaht(transfer.amount)}</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Service Bank</div>
                  <div className="text-sm text-gray-900 dark:text-white transition-colors">{getBankDisplay(transfer.serviceBankCode, transfer.serviceBankName)}</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Transaction Type</div>
                  <div className="text-sm text-gray-900 dark:text-white transition-colors">{transfer.transType || '-'}</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Created At</div>
                  <div className="text-sm text-gray-900 dark:text-white transition-colors">{formatDate(transfer.createdAt).date}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-500 transition-colors">{formatDate(transfer.createdAt).time}</div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Settlement Date</div>
                  <div className="text-sm text-gray-900 dark:text-white transition-colors">{transfer.settlementDate || '-'}</div>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">Account Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">From Account</div>
                    <div className="text-gray-900 dark:text-white font-mono transition-colors">{transfer.fromAccountNo || '-'}</div>
                    <div className="text-gray-500 dark:text-slate-500 transition-colors">{transfer.senderName || '-'}</div>
                    <div className="text-gray-500 dark:text-slate-500 transition-colors">Tax ID: {transfer.senderTaxID || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">To Account</div>
                    <div className="text-gray-900 dark:text-white font-mono transition-colors">{transfer.toAccountNo || '-'}</div>
                    <div className="text-gray-500 dark:text-slate-500 transition-colors">{transfer.toAccNameTH || transfer.toAccNameEN || '-'}</div>
                    <div className="text-gray-500 dark:text-slate-500 transition-colors">Bank: {getBankDisplay(transfer.toBankCode)}</div>
                  </div>
                </div>
              </div>

              {/* Member Info */}
              {transfer.member && (
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">Member Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Name</div>
                      <div className="text-gray-900 dark:text-white transition-colors">{transfer.member.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Citizen ID</div>
                      <div className="text-gray-900 dark:text-white font-mono transition-colors">{transfer.member.citizenId || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Account Status</div>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        transfer.member.accountStatus === 'Active' 
                          ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30' 
                          : 'bg-gray-100 dark:bg-slate-500/20 text-gray-700 dark:text-slate-400 border-gray-200 dark:border-slate-500/30'
                      } border transition-colors`}>
                        {transfer.member.accountStatus || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Info */}
              <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">Status Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Transfer Status</div>
                    <div className="text-gray-900 dark:text-white transition-colors">{transfer.transferStatus || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Inquiry Status</div>
                    <div className="text-gray-900 dark:text-white transition-colors">{transfer.inquiryStatus || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Response Code</div>
                    <div className="text-gray-900 dark:text-white font-mono transition-colors">{transfer.responseCode || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Response Message</div>
                    <div className="text-gray-900 dark:text-white transition-colors">{transfer.responseMsg || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Request DateTime</div>
                    <div className="text-gray-900 dark:text-white text-sm transition-colors">{formatDate(transfer.requestDateTime).date}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-500 transition-colors">{formatDate(transfer.requestDateTime).time}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Response DateTime</div>
                    <div className="text-gray-900 dark:text-white text-sm transition-colors">{formatDate(transfer.responseDateTime).date}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-500 transition-colors">{formatDate(transfer.responseDateTime).time}</div>
                  </div>
                </div>
              </div>

              {/* Reference Info */}
              <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">Reference Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Ref1</div>
                    <div className="text-gray-900 dark:text-white font-mono transition-colors">{transfer.ref1 || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Ref2</div>
                    <div className="text-gray-900 dark:text-white font-mono transition-colors">{transfer.ref2 || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Customer Mobile No</div>
                    <div className="text-gray-900 dark:text-white transition-colors">{transfer.customerMobileNo || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Full JSON View */}
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
                    Full Details (JSON)
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded text-xs text-gray-900 dark:text-white transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded text-xs text-gray-900 dark:text-white transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-slate-400 bg-yellow-500/20 px-2 py-1 rounded transition-colors">
                    Sensitive values masked
                  </span>
                </div>
                {showJsonDetails && maskedTransfer && (
                  <div className="mt-3 pt-2 pb-2">
                    <JsonEditor
                      value={maskedTransfer}
                      readOnly={true}
                      height="400px"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FundTransferDetailModal;



