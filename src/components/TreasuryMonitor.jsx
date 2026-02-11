import { useState, useEffect } from 'react';
import { transferConfigAPI } from '../services/api';
import { Landmark, Activity, AlertTriangle } from 'lucide-react';
import AppLoading from './AppLoading';

/**
 * Treasury Monitor Component
 * แสดงข้อมูล Bank Info ทั้งหมด
 */
const TreasuryMonitor = () => {
  const [bankInfo, setBankInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBankInfo();
  }, []);

  const [totals, setTotals] = useState({});

  const loadBankInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await transferConfigAPI.getBankInfo();
      
      // Response structure: { bankSummaries: [...], totals: {...} }
      const bankSummaries = response?.bankSummaries || [];
      const totalsData = response?.totals || {};
      
      setBankInfo(bankSummaries);
      setTotals(totalsData);
    } catch (err) {
      const errorMsg = err.message || err.response?.data?.message || 'Failed to load bank info';
      setError(errorMsg);
      console.error('Error loading bank info:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return '0';
    try {
      return parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch {
      return amount;
    }
  };

  const formatThaiBaht = (amount) => {
    return `฿${formatAmount(amount)}`;
  };

  const getBankIcon = (bankCode) => {
    // Map bank code to icon filename
    const bankIconMap = {
      '004': 'KBANK',
      '014': 'SCB',
      '002': 'BBL',
      '025': 'BAY',
    };
    
    const iconName = bankIconMap[bankCode];
    if (iconName) {
      return `/icon_bank/${iconName}.png`;
    }
    
    // Fallback: no icon available
    return null;
  };

  // const getAccountType = (bankCode) => {
  //   // Determine account type based on bank code or other logic
  //   return 'Operating';
  // };

  const calculateUsage = (bank) => {
    // Calculate usage based on net balance
    const netBalance = parseFloat(bank.netBalance || 0);
    const totalImport = parseFloat(bank.importAmount || 0);
    if (totalImport === 0) return 0;
    
    // Usage percentage based on export vs import ratio
    const exportAmount = parseFloat(bank.exportAmount || 0);
    const usagePercent = (exportAmount / totalImport) * 100;
    return Math.min(usagePercent, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage > 70) return 'bg-red-500';
    if (percentage > 50) return 'bg-yellow-500';
    if (percentage > 30) return 'bg-purple-500';
    return 'bg-green-500';
  };

  const getApiStatus = (bankCode) => {
    // Simulate API status - in real scenario, this would come from API
    const latency = bankCode === '014' ? 12 : bankCode === '004' ? 24 : 150;
    const status = latency < 50 ? 'online' : latency < 100 ? 'online' : 'lagging';
    const isOnline = latency < 100;
    return { 
      status, 
      latency, 
      colorClass: isOnline ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-500',
      dotColorClass: isOnline ? 'bg-green-600 dark:bg-green-400' : 'bg-yellow-600 dark:bg-yellow-500',
      animate: isOnline
    };
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg p-8 flex items-center justify-center shadow-sm transition-colors">
        <AppLoading size="lg" text="Loading Treasury Monitor..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-red-300 dark:border-red-500/30 rounded-lg p-4 shadow-sm transition-colors">
        <p className="text-red-600 dark:text-red-400 text-sm transition-colors">Error: {error}</p>
        <button
          onClick={loadBankInfo}
          className="mt-2 px-4 py-2 bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 px-3 py-1 rounded border border-red-200 dark:border-red-500/30 text-xs transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm transition-colors">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center transition-colors">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2 transition-colors">
          <Landmark className="w-4 h-4 text-gray-500 dark:text-slate-400 transition-colors" />
          Treasury Monitor
        </h3>
        {/* <button
          onClick={loadBankInfo}
          className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold uppercase tracking-wider transition-colors"
        >
          Refresh
        </button> */}
      </div>
      <table className="w-full text-left text-xs table-fixed">
        <colgroup>
          <col className="w-[35%]" />
          <col className="w-[20%]" />
          <col className="w-[25%]" />
          {/* <col className="w-[20%]" /> */}
        </colgroup>
        <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-600 dark:text-slate-500 transition-colors">
          <tr>
            <th className="px-5 py-2 font-semibold text-left">Bank / Account</th>
            <th className="px-5 py-2 font-semibold text-right">Balance (THB)</th>
            <th className="px-5 py-2 font-semibold text-right">Today's Mov.</th>
            {/* <th className="px-5 py-2 font-semibold text-right">Usage</th> */}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 text-gray-700 dark:text-slate-300 transition-colors">
          {!Array.isArray(bankInfo) || bankInfo.length === 0 ? (
            <tr>
              <td colSpan="4" className="px-5 py-4 text-center text-gray-500 dark:text-slate-500 transition-colors">
                No bank info found
              </td>
            </tr>
          ) : (
            bankInfo.map((bank, index) => {
              const icon = getBankIcon(bank.bankCode);
              const usage = calculateUsage(bank);
              const usageColor = getUsageColor(usage);

              return (
                <tr key={`${bank.bankCode}-${bank.accountNo}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {icon ? (
                        <img 
                          src={icon} 
                          alt={bank.bankName} 
                          className="w-8 h-8 rounded object-contain"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400 transition-colors">
                          {bank.bankCode}
                      </div>
                      )}
                      <div>
                        <div className="font-bold text-gray-900 dark:text-slate-200 transition-colors">{bank.bankName}</div>
                        <div className="text-[10px] text-gray-500 dark:text-slate-500 font-mono transition-colors">
                          {bank.accountNo}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="font-mono font-bold text-gray-900 dark:text-white text-sm transition-colors">
                    {formatThaiBaht(bank.netBalance)}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="font-mono flex flex-col items-end gap-0.5">
                      <span className="text-green-600 dark:text-green-400 transition-colors">+{formatThaiBaht(bank.importAmount || 0)}</span>
                      <span className="text-red-600 dark:text-red-400 text-[10px] transition-colors">-{formatThaiBaht(bank.exportAmount || 0)}</span>
                    </div>
                  </td>
                  {/* <td className="px-5 py-3 text-right">
                    <div className="flex justify-end">
                      <div className="w-16 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full transition-colors">
                      <div className={`${usageColor} h-1.5 rounded-full`} style={{ width: `${usage}%` }}></div>
                      </div>
                    </div>
                  </td> */}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      
      {/* Summary Footer */}
      {Array.isArray(bankInfo) && bankInfo.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 transition-colors">
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-gray-500 dark:text-slate-400 mb-1 transition-colors">Total Banks</div>
              <div className="text-gray-900 dark:text-white font-bold transition-colors">{bankInfo.length}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-slate-400 mb-1 transition-colors">Cash In</div>
              <div className="text-green-600 dark:text-green-400 font-mono font-bold transition-colors">{formatThaiBaht(totals.totalImport || 0)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-slate-400 mb-1 transition-colors">Cash Out</div>
              <div className="text-red-600 dark:text-red-400 font-mono font-bold transition-colors">{formatThaiBaht(totals.totalExport || 0)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-slate-400 mb-1 transition-colors">Net Balance</div>
              <div className="text-blue-600 dark:text-blue-400 font-mono font-bold transition-colors">{formatThaiBaht(totals.netBalance || 0)}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400 transition-colors">
            Total Transactions: {bankInfo.reduce((sum, bank) => sum + (bank.totalTransactions || 0), 0)}
          </div>
        </div>
      )}
    </div>
  );
};

export default TreasuryMonitor;

