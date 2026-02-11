import { useState } from 'react';
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react';

/**
 * Certificate/Key File Uploader Component
 * Support upload .pem, .crt, .key files or manual textarea input
 * Auto-converts multiline to single-line format for JSON storage
 */
const CertificateUploader = ({
  label = 'Certificate',
  value = '',
  onChange,
  accept = '.pem,.crt,.key,.txt',
  placeholder = 'Paste your certificate/key here...',
  required = false,
  help = '',
}) => {
  const [inputMode, setInputMode] = useState('upload'); // 'upload' or 'manual'
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Validate certificate/key format
  const validateCertificate = (content) => {
    if (!content) return false;
    
    // Check if it's a valid certificate or key
    const validPatterns = [
      /-----BEGIN CERTIFICATE-----/,
      /-----BEGIN RSA PRIVATE KEY-----/,
      /-----BEGIN PRIVATE KEY-----/,
      /-----BEGIN EC PRIVATE KEY-----/,
    ];
    
    return validPatterns.some(pattern => pattern.test(content));
  };

  // Convert multiline to single line (preserve format but store as one line)
  const convertToSingleLine = (content) => {
    // Keep the content as-is, including newlines
    // JSON.stringify will handle the conversion automatically
    return content.trim();
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setFileName(file.name);

    try {
      const text = await file.text();
      const processedContent = convertToSingleLine(text);
      
      if (validateCertificate(processedContent)) {
        setIsValid(true);
        onChange?.(processedContent);
      } else {
        setIsValid(false);
        setUploadError('Invalid certificate/key format');
      }
    } catch (err) {
      setUploadError('Failed to read file: ' + err.message);
      setIsValid(false);
    }
  };

  // Handle manual input
  const handleManualInput = (e) => {
    const content = e.target.value;
    const processedContent = convertToSingleLine(content);
    
    if (content && validateCertificate(content)) {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
    
    onChange?.(processedContent);
  };

  // Clear input
  const handleClear = () => {
    setFileName('');
    setUploadError('');
    setIsValid(false);
    onChange?.('');
  };

  // Format display value (show preview)
  const getDisplayValue = () => {
    if (!value) return '';
    
    // Show first and last few characters
    if (value.length > 100) {
      return `${value.substring(0, 50)}...\n...\n${value.substring(value.length - 50)}`;
    }
    return value;
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Mode Toggle */}
      <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setInputMode('upload')}
          className={`px-4 py-1.5 rounded text-xs font-medium transition ${
            inputMode === 'upload'
              ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          📄 Upload File
        </button>
        <button
          type="button"
          onClick={() => setInputMode('manual')}
          className={`px-4 py-1.5 rounded text-xs font-medium transition ${
            inputMode === 'manual'
              ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          ✏️ Manual Input
        </button>
      </div>

      {/* Upload Mode */}
      {inputMode === 'upload' && (
        <div>
          <label className="block">
            <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
              uploadError
                ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                : isValid
                ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                : 'border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:border-red-500 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}>
              <input
                type="file"
                accept={accept}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-slate-500" />
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                {accept} files
              </p>
            </div>
          </label>

          {/* File Info */}
          {fileName && (
            <div className={`mt-2 p-3 rounded-lg border flex items-center justify-between ${
              isValid
                ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                : 'border-red-500 bg-red-50 dark:bg-red-500/10'
            }`}>
              <div className="flex items-center gap-2">
                {isValid ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <FileText className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                <span className="text-sm text-gray-900 dark:text-white">{fileName}</span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-slate-400" />
              </button>
            </div>
          )}

          {uploadError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {uploadError}
            </p>
          )}
        </div>
      )}

      {/* Manual Mode */}
      {inputMode === 'manual' && (
        <div>
          <textarea
            value={value}
            onChange={handleManualInput}
            placeholder={placeholder}
            rows={8}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono text-xs transition-colors ${
              uploadError
                ? 'border-red-500'
                : isValid && value
                ? 'border-green-500'
                : 'border-gray-300 dark:border-slate-700'
            }`}
          />
          
          {value && (
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isValid ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" />
                    Valid format
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    Invalid format
                  </span>
                )}
                <span className="text-xs text-gray-500 dark:text-slate-500">
                  {value.length} characters
                </span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="px-2 py-1 text-xs text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {help && (
        <p className="text-xs text-gray-500 dark:text-slate-400 transition-colors">{help}</p>
      )}

      {/* Preview (when has value) */}
      {value && isValid && (
        <details className="mt-2">
          <summary className="text-xs text-gray-600 dark:text-slate-400 cursor-pointer hover:text-gray-900 dark:hover:text-white transition">
            Show Preview
          </summary>
          <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded text-xs font-mono text-gray-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
            {getDisplayValue()}
          </div>
        </details>
      )}
    </div>
  );
};

export default CertificateUploader;
