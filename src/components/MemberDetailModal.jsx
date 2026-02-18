import { useState, useEffect } from 'react';
import { membersAPI } from '../services/api';
import { X, Copy, Download, ChevronDown, ChevronUp } from 'lucide-react';
import JsonEditor from './JsonEditor';
import { maskSensitiveInObject, formatJSON } from '../utils/jsonUtils';
import { SENSITIVE_FIELDS } from '../constants/bankConfig';
import { toast } from '../utils/toast';
import AppLoading from './AppLoading';
import { getBankDisplay, getBankName } from '../utils/bankUtils';

/**
 * Member Detail Modal Component
 * Modal สำหรับแสดงรายละเอียด Member แบบเต็ม
 */
const MemberDetailModal = ({ 
  isOpen, 
  onClose, 
  memberId,
}) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [maskedMember, setMaskedMember] = useState(null);
  const [showJsonDetails, setShowJsonDetails] = useState(false);

  useEffect(() => {
    if (isOpen && memberId) {
      loadMemberDetail();
    } else {
      setMember(null);
      setMaskedMember(null);
      setError(null);
      setShowJsonDetails(false);
    }
  }, [isOpen, memberId]);

  const loadMemberDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await membersAPI.getById(memberId);
      
      // Handle different response structures: { data: {...} } or direct object
      const data = response?.data || response;
      
      console.log('Member detail data:', data);
      
      if (!data) {
        throw new Error('No data returned from API');
      }
      
      setMember(data);
      
      // Mask sensitive values for display
      const masked = maskSensitiveInObject(data, SENSITIVE_FIELDS);
      setMaskedMember(masked);
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to load member details');
      console.error('Error loading member detail:', err);
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
    switch (status?.toLowerCase()) {
      case 'active':
        return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
      case 'inactive':
      case 'suspended':
        return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
      default:
        return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
    }
  };

  const getRegistrationStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
        return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
      case 'PENDING':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
      case 'FAILED':
        return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
      default:
        return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
    }
  };

  const handleCopy = async () => {
    if (maskedMember) {
      try {
        await navigator.clipboard.writeText(formatJSON(maskedMember));
        toast.success('Copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
        toast.error('Failed to copy');
      }
    }
  };

  const handleExport = () => {
    if (!maskedMember) return;
    try {
      const formatted = formatJSON(maskedMember);
      const blob = new Blob([formatted], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `member-${memberId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-md transition-colors"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-colors">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center flex-shrink-0 transition-colors">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">Member Details</h3>
              {member && (
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 transition-colors">{member.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {maskedMember && (
                <>
                  <button
                    onClick={handleCopy}
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
                <AppLoading size="sm" text="Loading member details..." />
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg p-4 text-red-700 dark:text-red-400 transition-colors">
                {error}
              </div>
            )}

            {member && !loading && (
              <div className="space-y-6">
                {/* Member Information */}
                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">Member Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Name</div>
                      <div className="text-gray-900 dark:text-white transition-colors">{member.name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Citizen ID</div>
                      <div className="text-gray-900 dark:text-white font-mono transition-colors">{member.citizenId || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Account Status</div>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(member.accountStatus).bg} ${getStatusColor(member.accountStatus).text} ${getStatusColor(member.accountStatus).border} transition-colors`}>
                        {member.accountStatus || '-'}
                      </div>
                    </div>
                    {/* <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Member ID</div>
                      <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{member.memberId || '-'}</div>
                    </div> */}
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Created At</div>
                      <div className="text-gray-900 dark:text-white transition-colors">{formatDate(member.createdAt).date}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 transition-colors">{formatDate(member.createdAt).time}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Updated At</div>
                      <div className="text-gray-900 dark:text-white transition-colors">{formatDate(member.updatedAt).date}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 transition-colors">{formatDate(member.updatedAt).time}</div>
                    </div>
                  </div>
                </div>

                {/* Accounts - Combined from all Bank Registrations */}
                {(() => {
                  // Collect all accounts from all bank registrations
                  const allAccounts = [];
                  if (member.bankRegistrations && member.bankRegistrations.length > 0) {
                    member.bankRegistrations.forEach((reg) => {
                      if (reg.accounts && reg.accounts.length > 0) {
                        reg.accounts.forEach((account) => {
                          allAccounts.push({
                            ...account,
                            bankName: reg.bankName,
                            bankCode: reg.bankCode,
                            regRef: reg.regRef,
                            registrationId: reg.id,
                          });
                        });
                      }
                    });
                  }
                  
                  return allAccounts.length > 0 ? (
                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">
                        Accounts ({allAccounts.length})
                      </h4>
                      <div className="space-y-3">
                        {allAccounts.map((account, idx) => (
                          <div key={account.id || idx} className="bg-white dark:bg-slate-900/50 p-3 rounded border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                              <div>
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Account No.</div>
                                <div className="text-gray-900 dark:text-white font-mono transition-colors">{account.accountNo || '-'}</div>
                              </div>
                              <div>
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Account Name</div>
                                <div className="text-gray-900 dark:text-white transition-colors">{account.accountName || '-'}</div>
                              </div>
                              <div>
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Bank</div>
                                <div className="text-gray-900 dark:text-white transition-colors">{getBankDisplay(account.bankCode, account.bankName)}</div>
                              </div>
                              <div>
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Status</div>
                                <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${account.isActive ? getStatusColor('active').bg + ' ' + getStatusColor('active').text + ' ' + getStatusColor('active').border : getStatusColor('inactive').bg + ' ' + getStatusColor('inactive').text + ' ' + getStatusColor('inactive').border} transition-colors`}>
                                  {account.isActive ? 'Active' : 'Inactive'}
                                </div>
                              </div>
                              {account.espaId && (
                                <div className="md:col-span-2">
                                  <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">ESPA ID</div>
                                  <div className="text-gray-900 dark:text-white font-mono text-xs break-all transition-colors">{account.espaId}</div>
                                </div>
                              )}
                              <div>
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Reg Ref</div>
                                <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{account.regRef || '-'}</div>
                              </div>
                              <div>
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Created At</div>
                                <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(account.createdAt).date} {formatDate(account.createdAt).time}</div>
                              </div>
                              {account.deactivatedAt && (
                                <div>
                                  <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Deactivated At</div>
                                  <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(account.deactivatedAt).date} {formatDate(account.deactivatedAt).time}</div>
                                </div>
                              )}
                              {account.reactivatedAt && (
                                <div>
                                  <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Reactivated At</div>
                                  <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(account.reactivatedAt).date} {formatDate(account.reactivatedAt).time}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Bank Registrations */}
                {member.bankRegistrations && member.bankRegistrations.length > 0 && (
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">
                      Bank Registrations ({member.bankRegistrations.length})
                    </h4>
                    <div className="space-y-4">
                      {member.bankRegistrations.map((reg, idx) => (
                        <div key={reg.id || idx} className="bg-white dark:bg-slate-900/50 p-4 rounded border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Reg Ref</div>
                              <div className="text-gray-900 dark:text-white font-mono transition-colors">{reg.regRef || '-'}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Bank</div>
                              <div className="text-gray-900 dark:text-white transition-colors">{getBankDisplay(reg.bankCode, reg.bankName)}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Status</div>
                              <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getRegistrationStatusColor(reg.status).bg} ${getRegistrationStatusColor(reg.status).text} ${getRegistrationStatusColor(reg.status).border} transition-colors`}>
                                {reg.status || '-'}
                              </div>
                            </div>
                            {reg.statusDesc && (
                              <div className="md:col-span-3">
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Status Description</div>
                                <div className="text-gray-900 dark:text-white transition-colors">{reg.statusDesc}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Created At</div>
                              <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(reg.createdAt).date} {formatDate(reg.createdAt).time}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Updated At</div>
                              <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(reg.updatedAt).date} {formatDate(reg.updatedAt).time}</div>
                            </div>
                          </div>
                          
                          {/* Accounts */}
                          {reg.accounts && reg.accounts.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                              <div className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2 transition-colors">
                                Accounts ({reg.accounts.length})
                              </div>
                              <div className="space-y-2">
                                {reg.accounts.map((account, accIdx) => (
                                  <div key={account.id || accIdx} className="bg-gray-50 dark:bg-slate-800/50 p-2 rounded border border-gray-200 dark:border-slate-700">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                                      <div>
                                        <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Account No.</div>
                                        <div className="text-gray-900 dark:text-white font-mono transition-colors">{account.accountNo || '-'}</div>
                                      </div>
                                      <div>
                                        <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Account Name</div>
                                        <div className="text-gray-900 dark:text-white transition-colors">{account.accountName || '-'}</div>
                                      </div>
                                      {account.espaId && (
                                        <div>
                                          <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">ESPA ID</div>
                                          <div className="text-gray-900 dark:text-white font-mono text-xs break-all transition-colors">{account.espaId}</div>
                                        </div>
                                      )}
                                      <div>
                                        <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Status</div>
                                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${account.isActive ? getStatusColor('active').bg + ' ' + getStatusColor('active').text + ' ' + getStatusColor('active').border : getStatusColor('inactive').bg + ' ' + getStatusColor('inactive').text + ' ' + getStatusColor('inactive').border} transition-colors`}>
                                          {account.isActive ? 'Active' : 'Inactive'}
                                        </div>
                                      </div>
                                      {account.deactivatedAt && (
                                        <div>
                                          <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Deactivated At</div>
                                          <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(account.deactivatedAt).date} {formatDate(account.deactivatedAt).time}</div>
                                        </div>
                                      )}
                                      {account.reactivatedAt && (
                                        <div>
                                          <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Reactivated At</div>
                                          <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(account.reactivatedAt).date} {formatDate(account.reactivatedAt).time}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bank Histories */}
                {member.bankHistories && member.bankHistories.length > 0 && (
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">
                      Bank Histories ({member.bankHistories.length})
                    </h4>
                    <div className="space-y-4">
                      {member.bankHistories.map((history, idx) => (
                        <div key={history.id || idx} className="bg-white dark:bg-slate-900/50 p-4 rounded border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Total Registered Banks</div>
                              <div className="text-gray-900 dark:text-white transition-colors">{history.totalRegisteredBanks || 0}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Registered Bank Codes</div>
                              <div className="text-gray-900 dark:text-white text-xs transition-colors">
                                {history.registeredBankCodes && history.registeredBankCodes.length > 0 
                                  ? history.registeredBankCodes.map(code => getBankDisplay(code)).join(', ') 
                                  : '-'}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Created At</div>
                              <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(history.createdAt).date} {formatDate(history.createdAt).time}</div>
                            </div>
                            {history.bankDetails?.lastRegistration && (
                              <div>
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Last Registration</div>
                                <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(history.bankDetails.lastRegistration).date} {formatDate(history.bankDetails.lastRegistration).time}</div>
                              </div>
                            )}
                          </div>
                          
                          {/* Bank Details */}
                          {history.bankDetails?.banks && history.bankDetails.banks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                              <div className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2 transition-colors">
                                Bank Details ({history.bankDetails.banks.length})
                              </div>
                              <div className="space-y-2">
                                {history.bankDetails.banks.map((bank, bankIdx) => (
                                  <div key={bankIdx} className="bg-gray-50 dark:bg-slate-800/50 p-2 rounded border border-gray-200 dark:border-slate-700">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                                      <div>
                                        <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Bank</div>
                                        <div className="text-gray-900 dark:text-white transition-colors">{getBankDisplay(bank.bankCode, bank.bankName)}</div>
                                      </div>
                                      <div>
                                        <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Status</div>
                                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getRegistrationStatusColor(bank.status).bg} ${getRegistrationStatusColor(bank.status).text} ${getRegistrationStatusColor(bank.status).border} transition-colors`}>
                                          {bank.status || '-'}
                                        </div>
                                      </div>
                                      {bank.lastUpdated && (
                                        <div>
                                          <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Last Updated</div>
                                          <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(bank.lastUpdated).date} {formatDate(bank.lastUpdated).time}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bank Payments */}
                {member.bankPayments && member.bankPayments.length > 0 && (
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">
                      Bank Payments ({member.bankPayments.length})
                    </h4>
                    <div className="space-y-3">
                      {member.bankPayments.map((payment, idx) => (
                        <div key={payment.id || idx} className="bg-white dark:bg-slate-900/50 p-3 rounded border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Ref</div>
                              <div className="text-gray-900 dark:text-white font-mono transition-colors">{payment.ref || '-'}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Bank</div>
                              <div className="text-gray-900 dark:text-white transition-colors">{getBankDisplay(payment.bankCode, payment.bankName)}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Account No.</div>
                              <div className="text-gray-900 dark:text-white font-mono transition-colors">{payment.accountNo || '-'}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Amount</div>
                              <div className="text-gray-900 dark:text-white font-bold transition-colors">{formatThaiBaht(payment.amount)}</div>
                            </div>
                            {payment.txnNumber && (
                              <div>
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">TXN Number</div>
                                <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{payment.txnNumber}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Status</div>
                              <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(payment.status).bg} ${getStatusColor(payment.status).text} ${getStatusColor(payment.status).border} transition-colors`}>
                                {payment.status || '-'}
                              </div>
                            </div>
                            {payment.errorMessage && (
                              <div className="md:col-span-4">
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Message</div>
                                <div className="text-gray-900 dark:text-white text-xs transition-colors">{payment.errorMessage}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Created At</div>
                              <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(payment.createdAt).date} {formatDate(payment.createdAt).time}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fund Transfers */}
                {member.fundTransfers && member.fundTransfers.length > 0 && (
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 transition-colors">
                      Fund Transfers ({member.fundTransfers.length})
                    </h4>
                    <div className="space-y-3">
                      {member.fundTransfers.map((transfer, idx) => (
                        <div key={transfer.id || idx} className="bg-white dark:bg-slate-900/50 p-3 rounded border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">RS Trans ID</div>
                              <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{transfer.rsTransID || '-'}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Merchant Trans ID</div>
                              <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{transfer.merchantTransID || '-'}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">From Bank</div>
                              <div className="text-gray-900 dark:text-white transition-colors">{getBankDisplay(transfer.serviceBankCode, transfer.serviceBankName)}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">To Bank</div>
                              <div className="text-gray-900 dark:text-white transition-colors">{getBankDisplay(transfer.toBankCode)}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Amount</div>
                              <div className="text-gray-900 dark:text-white font-bold transition-colors">{formatThaiBaht(transfer.amount)}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">From Account</div>
                              <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{transfer.fromAccountNo || '-'}</div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">To Account</div>
                              <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{transfer.toAccountNo || '-'}</div>
                            </div>
                            {transfer.ref1 && (
                              <div>
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Ref1</div>
                                <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{transfer.ref1}</div>
                              </div>
                            )}
                            {transfer.ref2 && (
                              <div>
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Ref2</div>
                                <div className="text-gray-900 dark:text-white font-mono text-xs transition-colors">{transfer.ref2}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Status</div>
                              <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(transfer.transferStatus || transfer.inquiryStatus).bg} ${getStatusColor(transfer.transferStatus || transfer.inquiryStatus).text} ${getStatusColor(transfer.transferStatus || transfer.inquiryStatus).border} transition-colors`}>
                                {transfer.transferStatus || transfer.inquiryStatus || '-'}
                              </div>
                            </div>
                            {transfer.responseMsg && (
                              <div className="md:col-span-4">
                                <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Response Message</div>
                                <div className="text-gray-900 dark:text-white text-xs transition-colors">{transfer.responseMsg}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-gray-600 dark:text-slate-400 mb-1 transition-colors">Created At</div>
                              <div className="text-gray-900 dark:text-white text-xs transition-colors">{formatDate(transfer.createdAt).date} {formatDate(transfer.createdAt).time}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                      Sensitive values masked
                    </span>
                  </div>
                  {showJsonDetails && maskedMember && (
                    <div className="pt-2 pb-2">
                      <JsonEditor
                        value={maskedMember}
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
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end flex-shrink-0 transition-colors">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetailModal;
