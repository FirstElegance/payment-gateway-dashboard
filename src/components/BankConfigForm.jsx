import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bankConfigAPI } from '../services/api';
import JsonEditor from './JsonEditor';
import DynamicConfigForm from './DynamicConfigForm';
import PaymentGatewayConfigForm from './PaymentGatewayConfigForm';
import { BANK_CODES, SERVICE_CODES } from '../constants/bankConfig';
import { validateJSON } from '../utils/jsonUtils';
import AppLoading from './AppLoading';

/**
 * Bank Config Form Component
 * Form สำหรับสร้าง/แก้ไข Bank Config
 * Features:
 * - Multi-step form (Bank Code, Service Code, Config)
 * - JSON Editor และ Dynamic Form
 * - Validation
 * - Save, Cancel, Reset
 */
const BankConfigForm = () => {
  const { bankCode: urlBankCode, serviceCode: urlServiceCode } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!(urlBankCode && urlServiceCode);

  // Form state
  const [step, setStep] = useState(1);
  const [bankCode, setBankCode] = useState(urlBankCode || '');
  const [serviceCode, setServiceCode] = useState(urlServiceCode || '');
  const [config, setConfig] = useState({});
  const [configJson, setConfigJson] = useState('{}');
  
  // Editor mode: 'json' or 'form'
  const [editorMode, setEditorMode] = useState('json');
  
  // Validation
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      loadConfig();
    }
  }, [isEditMode, urlBankCode, urlServiceCode]);

  const loadConfig = async () => {
    try {
      setLoadingData(true);
      const data = await bankConfigAPI.getOne(urlBankCode, urlServiceCode);
      setConfig(data.config || {});
      setConfigJson(JSON.stringify(data.config || {}, null, 2));
    } catch (err) {
      alert(`Failed to load config: ${err.response?.data?.message || err.message}`);
      navigate('/bank-configs');
    } finally {
      setLoadingData(false);
    }
  };

  const validateStep = () => {
    const newErrors = {};

    if (step === 1) {
      if (!bankCode) {
        newErrors.bankCode = 'Bank Code is required';
      }
    }

    if (step === 2) {
      if (!serviceCode) {
        newErrors.serviceCode = 'Service Code is required';
      }
    }

    if (step === 3) {
      const validation = validateJSON(JSON.stringify(config));
      if (!validation.valid) {
        newErrors.config = validation.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
      setErrors({});
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleConfigChange = (newConfig) => {
    setConfig(newConfig);
    setErrors({ ...errors, config: null });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all changes?')) {
      if (isEditMode) {
        loadConfig();
      } else {
        setBankCode('');
        setServiceCode('');
        setConfig({});
        setConfigJson('{}');
        setStep(1);
      }
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      return;
    }

    try {
      setLoading(true);
      const data = {
        bankCode,
        serviceCode,
        config,
      };

      if (isEditMode) {
        await bankConfigAPI.update(bankCode, serviceCode, data);
      } else {
        await bankConfigAPI.create(data);
      }

      navigate('/bank-configs');
    } catch (err) {
      alert(`Failed to ${isEditMode ? 'update' : 'create'} config: ${err.response?.data?.message || err.message}`);
      console.error('Error saving config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      navigate('/bank-configs');
    }
  };

  // Check if config has any fields (for showing editor mode toggle)
  const hasConfigFields = config && Object.keys(config).length > 0;
  
  // Check if current service is PAYMENT_GATEWAY (Business Layer Config)
  const isPaymentGateway = serviceCode === 'PAYMENT_GATEWAY';

  if (loadingData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <AppLoading size="lg" text="Loading..." />
          <p className="mt-4 text-gray-600 dark:text-slate-400">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Edit' : 'Create'} Bank Configuration
          </h1>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-slate-700 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
                    step >= stepNum
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-400'
                  }`}
                >
                  {stepNum}
                </div>
                <div className={`mt-2 text-xs text-center ${step >= stepNum ? 'text-gray-700 dark:text-slate-300' : 'text-gray-500 dark:text-slate-500'} transition-colors`}>
                  {stepNum === 1 && 'Bank Code'}
                  {stepNum === 2 && 'Service Code'}
                  {stepNum === 3 && 'Configuration'}
                </div>
              </div>
              {stepNum < 3 && (
                <div
                  className={`h-1 flex-1 mx-2 transition ${
                    step > stepNum ? 'bg-red-600' : 'bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Bank Code */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Bank Code</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Bank Code <span className="text-red-500">*</span>
            </label>
            <select
              value={bankCode}
              onChange={(e) => {
                setBankCode(e.target.value);
                setErrors({ ...errors, bankCode: null });
              }}
              className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-500 ${
                errors.bankCode ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'
              }`}
            >
              <option value="">Select a bank code</option>
              {BANK_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            {errors.bankCode && (
              <p className="mt-1 text-xs text-red-400">{errors.bankCode}</p>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white dark:text-white rounded-lg shadow-lg shadow-red-600/20 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Service Code */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Service Code</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
              Service Code <span className="text-red-500">*</span>
            </label>
            <select
              value={serviceCode}
              onChange={(e) => {
                setServiceCode(e.target.value);
                setErrors({ ...errors, serviceCode: null });
                // Reset config when service code changes
                setConfig({});
              }}
              className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-500 ${
                errors.serviceCode ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'
              }`}
            >
              <option value="">Select a service code</option>
              {SERVICE_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            {errors.serviceCode && (
              <p className="mt-1 text-xs text-red-400">{errors.serviceCode}</p>
            )}
          </div>
          <div className="mt-6 flex justify-between">
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-slate-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-gray-900 dark:text-white rounded-lg shadow-lg shadow-red-600/20 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Configuration */}
      {step === 3 && (
        <div className="bg-white dark:bg-slate-900/70 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Configuration</h2>
              {isPaymentGateway && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Business Layer Configuration
                </p>
              )}
            </div>
            {/* Editor Mode Toggle */}
            {hasConfigFields && (
              <div className="flex gap-2 bg-white dark:bg-slate-800 rounded-lg p-1 border border-gray-300 dark:border-slate-700">
                <button
                  onClick={() => setEditorMode('form')}
                  className={`px-4 py-1 rounded text-xs font-medium transition ${
                    editorMode === 'form'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {isPaymentGateway ? 'Business Form' : 'Smart Form'}
                </button>
                <button
                  onClick={() => setEditorMode('json')}
                  className={`px-4 py-1 rounded text-xs font-medium transition ${
                    editorMode === 'json'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  JSON Editor
                </button>
              </div>
            )}
          </div>

          {errors.config && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
              {errors.config}
            </div>
          )}

          {editorMode === 'form' ? (
            <div className="pt-2 pb-2">
              {isPaymentGateway ? (
                <PaymentGatewayConfigForm
                  config={config}
                  onChange={handleConfigChange}
                />
              ) : (
                <DynamicConfigForm
                  config={config}
                  onChange={handleConfigChange}
                />
              )}
            </div>
          ) : (
            <div className="pt-2 pb-2">
              <JsonEditor
                value={config}
                onChange={handleConfigChange}
                height="500px"
              />
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <div className="flex gap-2">
              <button
                onClick={handleBack}
                className="px-6 py-2 bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-slate-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg border border-yellow-500/30 transition"
              >
                Reset
              </button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-gray-900 dark:text-white rounded-lg shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isEditMode ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankConfigForm;

