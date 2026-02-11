import { useState } from 'react';
import { Upload, Eye, EyeOff, X, ChevronDown, ChevronUp } from 'lucide-react';
import CertificateUploader from './CertificateUploader';
import JsonEditor from './JsonEditor';
import { generateDynamicSchema, sortFieldsByPriority } from '../utils/schemaDetector';

/**
 * Dynamic Config Form Component
 * Auto-generate form fields จาก config object โดยไม่ต้องรู้ schema ล่วงหน้า
 * 
 * Features:
 * - Auto-detect field types (file, password, url, text, number, boolean, array, object)
 * - File uploader สำหรับ cert/key
 * - Password input (masked)
 * - URL validation
 * - JSON editor สำหรับ complex types (array, object)
 */
const DynamicConfigForm = ({ config, onChange }) => {
  const [showPasswords, setShowPasswords] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});

  // Generate schema from config
  const schema = generateDynamicSchema(config);
  const sortedFields = sortFieldsByPriority(schema);

  const handleFieldChange = (key, value) => {
    onChange({
      ...config,
      [key]: value
    });
  };

  const togglePasswordVisibility = (key) => {
    setShowPasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleSection = (key) => {
    setCollapsedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderField = (key, fieldConfig) => {
    const value = config[key];
    const isCollapsed = collapsedSections[key];

    // File Upload (cert, key)
    if (fieldConfig.type === 'file') {
      return (
        <div key={key} className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
            {fieldConfig.label}
            {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <CertificateUploader
            value={value || ''}
            onChange={(newValue) => handleFieldChange(key, newValue)}
            accept={fieldConfig.accept}
            placeholder={fieldConfig.placeholder}
          />
          {fieldConfig.help && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {fieldConfig.help}
            </p>
          )}
        </div>
      );
    }

    // Password/Secret Field
    if (fieldConfig.type === 'password') {
      const showPassword = showPasswords[key];
      return (
        <div key={key} className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
            {fieldConfig.label}
            {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={value || ''}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              placeholder={fieldConfig.placeholder}
              className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 transition-colors"
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility(key)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      );
    }

    // URL Field
    if (fieldConfig.type === 'url') {
      return (
        <div key={key} className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
            {fieldConfig.label}
            {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="url"
            value={value || ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            placeholder={fieldConfig.placeholder}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 font-mono text-sm transition-colors"
          />
        </div>
      );
    }

    // Number Field
    if (fieldConfig.type === 'number') {
      return (
        <div key={key} className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
            {fieldConfig.label}
            {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleFieldChange(key, e.target.value ? Number(e.target.value) : '')}
            placeholder={fieldConfig.placeholder}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 transition-colors"
          />
        </div>
      );
    }

    // Boolean Field
    if (fieldConfig.type === 'boolean') {
      return (
        <div key={key} className="mb-4 flex items-center">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleFieldChange(key, e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label className="ml-3 text-sm font-semibold text-gray-700 dark:text-slate-300">
            {fieldConfig.label}
          </label>
        </div>
      );
    }

    // Array/Object Field - Use JSON Editor (Collapsible)
    if (fieldConfig.type === 'array' || fieldConfig.type === 'object') {
      return (
        <div key={key} className="mb-6">
          <button
            type="button"
            onClick={() => toggleSection(key)}
            className="flex items-center justify-between w-full text-left text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <span>
              {fieldConfig.label}
              {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
              <span className="text-xs text-gray-500 dark:text-slate-400 ml-2 font-normal">
                ({fieldConfig.type})
              </span>
            </span>
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          
          {!isCollapsed && (
            <div className="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden">
              <JsonEditor
                value={value || (fieldConfig.type === 'array' ? [] : {})}
                onChange={(newValue) => handleFieldChange(key, newValue)}
                height="200px"
              />
            </div>
          )}
        </div>
      );
    }

    // Default: Text Field
    return (
      <div key={key} className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
          {fieldConfig.label}
          {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleFieldChange(key, e.target.value)}
          placeholder={fieldConfig.placeholder}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-200 transition-colors"
        />
      </div>
    );
  };

  // Empty config
  if (!config || Object.keys(config).length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 mb-4">
          <Upload size={32} className="text-gray-400 dark:text-slate-500" />
        </div>
        <p className="text-gray-500 dark:text-slate-400 text-sm">
          No configuration fields available.
          <br />
          Start by adding fields to your config.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedFields.map(([key, fieldConfig]) => renderField(key, fieldConfig))}
    </div>
  );
};

export default DynamicConfigForm;
