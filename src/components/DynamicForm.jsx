import { useState, useEffect } from 'react';
import { deepClone } from '../utils/jsonUtils';
import CertificateUploader from './CertificateUploader';

/**
 * Dynamic Form Builder Component
 * สร้าง form fields อัตโนมัติจาก schema configuration
 * 
 * Features:
 * - Generate form fields from schema
 * - Support nested objects และ arrays
 * - Add/Remove array items
 * - Validation
 * - Error messages
 * - Field dependencies
 */
const DynamicForm = ({ 
  schema = {}, 
  value = {}, 
  onChange,
  className = '',
}) => {
  const [formData, setFormData] = useState(value);
  const [errors, setErrors] = useState({});

  // Update formData when value prop changes
  useEffect(() => {
    setFormData(value || {});
  }, [value]);

  // Validate field
  const validateField = (fieldName, fieldValue, fieldSchema) => {
    if (fieldSchema.required && (!fieldValue || fieldValue === '')) {
      return `${fieldSchema.label || fieldName} is required`;
    }
    
    if (fieldSchema.type === 'url' && fieldValue) {
      try {
        new URL(fieldValue);
      } catch {
        return `${fieldSchema.label || fieldName} must be a valid URL`;
      }
    }

    if (fieldSchema.type === 'number' && fieldValue && isNaN(Number(fieldValue))) {
      return `${fieldSchema.label || fieldName} must be a number`;
    }

    return null;
  };

  // Handle field change
  const handleFieldChange = (fieldName, fieldValue, fieldSchema) => {
    const newData = deepClone(formData);
    newData[fieldName] = fieldValue;
    setFormData(newData);

    // Validate
    const error = validateField(fieldName, fieldValue, fieldSchema);
    const newErrors = { ...errors };
    if (error) {
      newErrors[fieldName] = error;
    } else {
      delete newErrors[fieldName];
    }
    setErrors(newErrors);

    // Notify parent
    if (onChange) {
      onChange(newData);
    }
  };

  // Handle nested object field change
  const handleNestedChange = (parentField, fieldName, fieldValue) => {
    const newData = deepClone(formData);
    if (!newData[parentField]) {
      newData[parentField] = {};
    }
    newData[parentField][fieldName] = fieldValue;
    setFormData(newData);

    if (onChange) {
      onChange(newData);
    }
  };

  // Handle array item change
  const handleArrayItemChange = (fieldName, index, itemValue) => {
    const newData = deepClone(formData);
    if (!Array.isArray(newData[fieldName])) {
      newData[fieldName] = [];
    }
    newData[fieldName][index] = itemValue;
    setFormData(newData);

    if (onChange) {
      onChange(newData);
    }
  };

  // Add array item
  const handleAddArrayItem = (fieldName, itemSchema) => {
    const newData = deepClone(formData);
    if (!Array.isArray(newData[fieldName])) {
      newData[fieldName] = [];
    }
    
    // Create empty item from schema
    const newItem = {};
    if (itemSchema) {
      Object.keys(itemSchema).forEach((key) => {
        newItem[key] = '';
      });
    }
    
    newData[fieldName].push(newItem);
    setFormData(newData);

    if (onChange) {
      onChange(newData);
    }
  };

  // Remove array item
  const handleRemoveArrayItem = (fieldName, index) => {
    const newData = deepClone(formData);
    if (Array.isArray(newData[fieldName])) {
      newData[fieldName].splice(index, 1);
      setFormData(newData);

      if (onChange) {
        onChange(newData);
      }
    }
  };

  // Render field based on type
  const renderField = (fieldName, fieldSchema, fieldValue, prefix = '') => {
    const fullFieldName = prefix ? `${prefix}.${fieldName}` : fieldName;
    const fieldType = fieldSchema.type || 'text';
    const fieldLabel = fieldSchema.label || fieldName;
    const isRequired = fieldSchema.required || false;
    const error = errors[fullFieldName];

    // Array type
    if (fieldType === 'array' && fieldSchema.itemSchema) {
      const arrayValue = Array.isArray(fieldValue) ? fieldValue : [];
      
      return (
        <div key={fieldName} className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 transition-colors">
            {fieldLabel} {isRequired && <span className="text-red-500">*</span>}
          </label>
          
          {arrayValue.map((item, index) => (
            <div key={index} className="mb-4 p-4 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-600 dark:text-slate-300 transition-colors">
                  Item {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveArrayItem(fieldName, index)}
                  className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
              
              <div className="space-y-4">
                {Object.keys(fieldSchema.itemSchema).map((itemFieldName) => {
                  const itemFieldSchema = fieldSchema.itemSchema[itemFieldName];
                  const itemFieldValue = item?.[itemFieldName] || '';
                  return renderField(
                    itemFieldName,
                    itemFieldSchema,
                    itemFieldValue,
                    `${fieldName}[${index}]`
                  );
                })}
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={() => handleAddArrayItem(fieldName, fieldSchema.itemSchema)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition-colors"
          >
            + Add {fieldLabel}
          </button>
          
          {error && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400 transition-colors">{error}</p>
          )}
        </div>
      );
    }

    // Object type (nested)
    if (fieldType === 'object' && fieldSchema.fields) {
      const objectValue = typeof fieldValue === 'object' && fieldValue !== null ? fieldValue : {};
      
      return (
        <div key={fieldName} className="mb-6 p-4 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50/50 dark:bg-slate-800/30 transition-colors">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 transition-colors">
            {fieldLabel} {isRequired && <span className="text-red-500">*</span>}
          </label>
          
          <div className="space-y-4">
            {Object.keys(fieldSchema.fields).map((nestedFieldName) => {
              const nestedFieldSchema = fieldSchema.fields[nestedFieldName];
              const nestedFieldValue = objectValue[nestedFieldName] || '';
              return renderField(
                nestedFieldName,
                nestedFieldSchema,
                nestedFieldValue,
                fullFieldName
              );
            })}
          </div>
        </div>
      );
    }

    // Certificate/Key uploader
    if (fieldType === 'certificate') {
      return (
        <div key={fieldName} className="mb-6">
          <CertificateUploader
            label={fieldLabel}
            value={fieldValue || ''}
            onChange={(newValue) => handleFieldChange(fieldName, newValue, fieldSchema)}
            required={isRequired}
            help={fieldSchema.help}
            accept={fieldSchema.accept || '.pem,.crt,.key,.txt'}
            placeholder={fieldSchema.placeholder || 'Paste your certificate/key here...'}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400 transition-colors">{error}</p>
          )}
        </div>
      );
    }

    // Regular input fields
    const inputClasses = `w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white transition-colors ${
      error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-slate-700'
    }`;

    return (
      <div key={fieldName} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">
          {fieldLabel} {isRequired && <span className="text-red-500">*</span>}
        </label>
        
        {fieldType === 'textarea' ? (
          <textarea
            value={fieldValue || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value, fieldSchema)}
            className={inputClasses}
            rows={fieldSchema.rows || 4}
            placeholder={fieldSchema.placeholder || ''}
          />
        ) : fieldType === 'password' ? (
          <input
            type="password"
            value={fieldValue || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value, fieldSchema)}
            className={inputClasses}
            placeholder={fieldSchema.placeholder || ''}
          />
        ) : (
          <input
            type={fieldType === 'number' ? 'number' : fieldType === 'url' ? 'url' : 'text'}
            value={fieldValue || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value, fieldSchema)}
            className={inputClasses}
            placeholder={fieldSchema.placeholder || ''}
          />
        )}
        
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400 transition-colors">{error}</p>
        )}
        
        {fieldSchema.help && (
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 transition-colors">{fieldSchema.help}</p>
        )}
      </div>
    );
  };

  return (
    <div className={`dynamic-form ${className}`}>
      <div className="space-y-4">
        {Object.keys(schema).map((fieldName) => {
          const fieldSchema = schema[fieldName];
          const fieldValue = formData[fieldName];
          return renderField(fieldName, fieldSchema, fieldValue);
        })}
      </div>
    </div>
  );
};

export default DynamicForm;









