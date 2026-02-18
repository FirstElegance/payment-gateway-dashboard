import { useState, useEffect } from 'react';
import { qrPaymentAPI } from '../services/api';
import { X, Copy, Download, ChevronDown, ChevronUp } from 'lucide-react';
import JsonEditor from './JsonEditor';
import { maskSensitiveInObject, formatJSON } from '../utils/jsonUtils';
import { SENSITIVE_FIELDS } from '../constants/bankConfig';
import { toast } from '../utils/toast';
import AppLoading from './AppLoading';

/**
 * QR Payment Detail Modal Component
 * Modal สำหรับแสดงรายละเอียด QR Payment แบบเต็ม
 */
const QrPaymentDetailModal = ({ 
  isOpen, 
  onClose, 
  qrPaymentId,
}) => {
  const [qrPayment, setQrPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [maskedQrPayment, setMaskedQrPayment] = useState(null);
  const [showJsonDetails, setShowJsonDetails] = useState(false);

  useEffect(() => {
    if (isOpen && qrPaymentId) {
      loadQrPaymentDetail();
    } else {
      // Reset state when modal closes
      setQrPayment(null);
      setMaskedQrPayment(null);
      setError(null);
    }
  }, [isOpen, qrPaymentId]);

  const loadQrPaymentDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await qrPaymentAPI.getById(qrPaymentId);
      
      // Handle different response structures: { data: {...} } or direct object
      const data = response?.data || response;
      
      console.log('QR Payment detail data:', data);
      
      if (!data) {
        throw new Error('No data returned from API');
      }
      
      setQrPayment(data);
      
      // Mask sensitive values for display (exclude qrData, qrCodeBase64, callbackUrl)
      const { qrData, qrCodeBase64, callbackUrl, ...dataWithoutSensitive } = data;
      const masked = maskSensitiveInObject(dataWithoutSensitive, SENSITIVE_FIELDS);
      setMaskedQrPayment(masked);
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to load QR payment details');
      console.error('Error loading QR payment detail:', err);
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
    if (!status) {
      return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
    }
    
    const statusStr = String(status).toUpperCase();
    switch (statusStr) {
      case 'GENERATED':
        return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
      case 'USED':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
      default:
        return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy');
    }
  };

  const handleExport = () => {
    if (!maskedQrPayment) return;
    try {
      const formatted = formatJSON(maskedQrPayment);
      const blob = new Blob([formatted], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-payment-${qrPaymentId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
    }
  };

  if (!isOpen) return null;

  const statusStyle = qrPayment ? getStatusColor(qrPayment.status) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-md transition-colors"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center flex-shrink-0 transition-colors">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">QR Payment Details</h3>
            </div>
            <div className="flex items-center gap-2">
              {maskedQrPayment && (
                <>
                  <button
                    onClick={() => handleCopy(formatJSON(maskedQrPayment))}
                    className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleExport}
                    className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Export JSON"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                title="Close"
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading && (
              <div className="flex justify-center items-center py-12">
                <AppLoading size="sm" text="Loading QR payment details..." />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded text-red-700 dark:text-red-400 text-sm transition-colors">
                Error: {error}
              </div>
            )}

            {!loading && !error && qrPayment && (
              <div className="space-y-6">
                {/* Basic Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Service Code</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white transition-colors">{qrPayment.serviceCode || '-'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Status</div>
                    <span className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} px-2 py-1 rounded text-xs font-bold border inline-block`}>
                      {qrPayment.status || '-'}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Bank Code</div>
                    <div className="text-sm font-mono text-gray-900 dark:text-white transition-colors">{qrPayment.bankCode || '-'}</div>
                    {qrPayment.suffix && (
                      <div className="text-xs text-gray-500 dark:text-slate-400 mt-1 transition-colors">Suffix: {qrPayment.suffix}</div>
                    )}
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Tax ID</div>
                    <div className="text-sm font-mono text-gray-900 dark:text-white transition-colors">{qrPayment.taxId || '-'}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Amount</div>
                    <div className="text-lg font-bold font-mono text-gray-900 dark:text-white transition-colors">{formatThaiBaht(qrPayment.amountInBaht)}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                    <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Created At</div>
                    <div className="text-sm text-gray-900 dark:text-white transition-colors">{formatDate(qrPayment.createdAt).date}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-500 transition-colors">{formatDate(qrPayment.createdAt).time}</div>
                  </div>
                </div>

                {/* Reference Info */}
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">Reference Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Ref1</div>
                      <div className="text-sm font-mono text-gray-900 dark:text-white transition-colors">{qrPayment.ref1 || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Ref2</div>
                      <div className="text-sm font-mono text-gray-900 dark:text-white transition-colors">{qrPayment.ref2 || '-'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs text-gray-600 dark:text-slate-400 mb-1 transition-colors">Internal Ref</div>
                      <div className="text-sm font-mono text-gray-900 dark:text-white transition-colors">{qrPayment.internalRef || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Request Body */}
                {qrPayment.requestBody && (
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">Request Body</h4>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded border border-gray-200 dark:border-slate-700">
                      <JsonEditor
                        value={qrPayment.requestBody}
                        readOnly={true}
                        height="200px"
                      />
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">ID</div>
                      <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors break-all">{qrPayment.id || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Updated At</div>
                      <div className="text-gray-900 dark:text-white text-sm transition-colors">{formatDate(qrPayment.updatedAt).date}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-500 transition-colors">{formatDate(qrPayment.updatedAt).time}</div>
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
                      View Full JSON Details
                     </button>
                    <span className="text-xs text-gray-600 dark:text-slate-400 bg-yellow-500/20 px-2 py-1 rounded transition-colors">
                      Sensitive values masked (qrData, qrCodeBase64, callbackUrl excluded)
                    </span>
                  </div>
                  {showJsonDetails && maskedQrPayment && (
                    <div className="pt-2 pb-2">
                      <JsonEditor
                        value={maskedQrPayment}
                        readOnly={true}
                        height="400px"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50 flex justify-end flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrPaymentDetailModal;
