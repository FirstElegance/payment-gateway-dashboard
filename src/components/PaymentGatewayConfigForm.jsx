import { useState } from 'react';
import { Settings, Info, ArrowRight } from 'lucide-react';

/**
 * Payment Gateway Config Form
 * Special form สำหรับ PAYMENT_GATEWAY (Business Layer Config)
 * 
 * Config นี้ไม่ใช่ config ของธนาคาร แต่เป็น config ระดับ business logic
 */
const PaymentGatewayConfigForm = ({ config, onChange }) => {
  const getBankIconPath = (bankCode) => {
    const bankIconMap = {
      '004': 'KBANK',
      '014': 'SCB',
      '002': 'BBL',
      '025': 'BAY',
    };
    const iconName = bankIconMap[bankCode];
    return iconName ? `/icon_bank/${iconName}.png` : null;
  };

  const getBankName = (bankCode) => {
    const bankNameMap = {
      '002': 'BBL',
      '004': 'KBANK',
      '014': 'SCB',
      '025': 'BAY',
    };
    return bankNameMap[bankCode] || bankCode;
  };

  const handleFieldChange = (field, value) => {
    onChange({
      ...config,
      [field]: value
    });
  };

  const handleNestedChange = (parent, field, value) => {
    onChange({
      ...config,
      [parent]: {
        ...(config[parent] || {}),
        [field]: value
      }
    });
  };

  const handleTransferMappingChange = (fromBank, toBank) => {
    const transferMapping = {
      ...(config.transferMapping || {}),
      [fromBank]: toBank
    };
    onChange({
      ...config,
      transferMapping
    });
  };

  // Available banks for selection
  const availableBanks = ['002', '004', '014', '025'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Info className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
            Business Layer Configuration
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            This is a system-wide business logic configuration, not a specific bank configuration.
            These settings affect how the payment gateway operates across all banks.
          </p>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} className="text-gray-600 dark:text-slate-400" />
          <h3 className="font-semibold text-gray-900 dark:text-slate-200">General Settings</h3>
        </div>

        {/* Profile Name */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
            Profile Name
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={config.profileName || ''}
            onChange={(e) => handleFieldChange('profileName', e.target.value)}
            placeholder="Company or organization name"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 transition-colors"
          />
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            The main profile name for the payment gateway
          </p>
        </div>

        {/* SCB Environment */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
            Environment
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            value={config.scb || 'PROD'}
            onChange={(e) => handleFieldChange('scb', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 transition-colors"
          >
            <option value="PROD">Production (PROD)</option>
            <option value="SANDBOX">Sandbox (SANDBOX)</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            EC (Elegance Bank) environment setting
          </p>
        </div>

        {/* KBANK Service (ODD Payment) */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
            KBANK Service (ODD Payment)
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            value={config.kbankServiceOdd || 'OLD'}
            onChange={(e) => handleFieldChange('kbankServiceOdd', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 transition-colors"
          >
            <option value="OLD">Old Version (Legacy)</option>
            <option value="NEW">New Version (Latest)</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            KBANK ODD Payment service version
          </p>
        </div>
      </div>

      {/* Amount Setting */}
      <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 dark:text-slate-200 mb-4">
          Amount Setting
        </h3>

        {/* Amount Type */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
            Type
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            value={config.amountSetting?.type || 'FIXED'}
            onChange={(e) => {
              const type = e.target.value;
              handleNestedChange('amountSetting', 'type', type);
              // Clear value if MANUAL
              if (type === 'MANUAL') {
                const newSetting = { ...config.amountSetting, type };
                delete newSetting.value;
                onChange({ ...config, amountSetting: newSetting });
              }
            }}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 transition-colors"
          >
            <option value="FIXED">Fixed Amount</option>
            <option value="MANUAL">Manual Amount</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {config.amountSetting?.type === 'FIXED' 
              ? 'Use a fixed amount for all transactions'
              : 'Amount will be entered manually for each transaction'
            }
          </p>
        </div>

        {/* Amount Value - Only show for FIXED */}
        {config.amountSetting?.type === 'FIXED' && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
              Value (Baht)
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="number"
              value={config.amountSetting?.value || 1}
              onChange={(e) => handleNestedChange('amountSetting', 'value', Number(e.target.value))}
              placeholder="Enter amount in Baht"
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 transition-colors"
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Fixed amount in Baht (e.g., 1.00)
            </p>
          </div>
        )}
      </div>

      {/* Transfer Setting */}
      <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 dark:text-slate-200 mb-4">
          Transfer Setting
        </h3>

        {/* Transfer Type */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
            Type
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            value={config.transferSetting?.type || 'MANUAL'}
            onChange={(e) => handleNestedChange('transferSetting', 'type', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 transition-colors"
          >
            <option value="FIXED">Fixed Transfer</option>
            <option value="MANUAL">Manual Transfer</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {config.transferSetting?.type === 'FIXED'
              ? 'Use a fixed transfer configuration'
              : 'Manual approval required for each transfer'
            }
          </p>
        </div>
      </div>

      {/* Transfer Mapping */}
      <div className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 dark:text-slate-200 mb-4">
          Transfer Mapping
        </h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
          Configure which bank code should map to which bank for fund transfers. Only mappings where the source and target differ are shown.
        </p>

        <div className="space-y-3">
          {availableBanks.map((fromBank) => {
            const currentMapping = config.transferMapping?.[fromBank] || fromBank;
            const fromIcon = getBankIconPath(fromBank);
            const toIcon = getBankIconPath(currentMapping);
            const isDifferent = fromBank !== currentMapping;

            return (
              <div
                key={fromBank}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isDifferent
                    ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                    : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600'
                }`}
              >
                {/* From Bank */}
                <div className="flex items-center gap-2 min-w-[100px]">
                  {fromIcon ? (
                    <img
                      src={fromIcon}
                      alt={getBankName(fromBank)}
                      className="w-6 h-6 rounded object-contain"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-mono">
                      {fromBank}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    {getBankName(fromBank)}
                  </span>
                </div>

                {/* Arrow */}
                <ArrowRight className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />

                {/* To Bank Select */}
                <div className="flex items-center gap-2 flex-1">
                  <select
                    value={currentMapping}
                    onChange={(e) => handleTransferMappingChange(fromBank, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 transition-colors text-sm"
                  >
                    {availableBanks.map((bank) => (
                      <option key={bank} value={bank}>
                        {getBankName(bank)} ({bank})
                      </option>
                    ))}
                  </select>
                  {toIcon && (
                    <img
                      src={toIcon}
                      alt={getBankName(currentMapping)}
                      className="w-6 h-6 rounded object-contain"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show only different mappings summary */}
        {(() => {
          const differentMappings = Object.entries(config.transferMapping || {})
            .filter(([from, to]) => from !== to);
          
          if (differentMappings.length === 0) {
            return (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                <p className="text-xs text-gray-600 dark:text-slate-400 text-center">
                  All banks map to themselves (no custom mappings)
                </p>
              </div>
            );
          }

          return (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Active Mappings:
              </p>
              <div className="flex flex-wrap gap-2">
                {differentMappings.map(([from, to]) => {
                  const fromIcon = getBankIconPath(from);
                  const toIcon = getBankIconPath(to);
                  return (
                    <div
                      key={`${from}-${to}`}
                      className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-700 rounded border border-blue-200 dark:border-blue-700"
                    >
                      {fromIcon ? (
                        <img src={fromIcon} alt={getBankName(from)} className="w-4 h-4 rounded object-contain" />
                      ) : (
                        <span className="text-[10px] font-mono">{from}</span>
                      )}
                      <ArrowRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      {toIcon ? (
                        <img src={toIcon} alt={getBankName(to)} className="w-4 h-4 rounded object-contain" />
                      ) : (
                        <span className="text-[10px] font-mono">{to}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-200 mb-2">
          Current Configuration Summary
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-slate-400">Profile:</span>
            <span className="font-mono text-gray-900 dark:text-slate-200">
              {config.profileName || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-slate-400">SCB Environment:</span>
            <span className="font-mono text-gray-900 dark:text-slate-200">
              {config.scb || 'PROD'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-slate-400">KBANK Service:</span>
            <span className="font-mono text-gray-900 dark:text-slate-200">
              {config.kbankServiceOdd || 'OLD'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-slate-400">Amount:</span>
            <span className="font-mono text-gray-900 dark:text-slate-200">
              {config.amountSetting?.type || 'FIXED'}
              {config.amountSetting?.type === 'FIXED' && ` (${config.amountSetting?.value || 1} Baht)`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-slate-400">Transfer:</span>
            <span className="font-mono text-gray-900 dark:text-slate-200">
              {config.transferSetting?.type || 'MANUAL'}
            </span>
          </div>
          {config.transferMapping && (() => {
            const differentMappings = Object.entries(config.transferMapping).filter(([from, to]) => from !== to);
            return differentMappings.length > 0 ? (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-400">Transfer Mapping:</span>
                <span className="font-mono text-gray-900 dark:text-slate-200 text-xs">
                  {differentMappings.map(([from, to]) => `${from}→${to}`).join(', ')}
                </span>
              </div>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
};

export default PaymentGatewayConfigForm;
