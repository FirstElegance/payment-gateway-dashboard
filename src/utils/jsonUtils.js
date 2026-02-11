/**
 * JSON Utilities
 * ฟังก์ชันช่วยเหลือสำหรับจัดการ JSON
 */

/**
 * Format JSON string ให้เป็น pretty print
 * @param {Object|string} json - JSON object หรือ string
 * @returns {string} Formatted JSON string
 */
export const formatJSON = (json) => {
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
};

/**
 * Validate JSON string
 * @param {string} jsonString - JSON string to validate
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export const validateJSON = (jsonString) => {
  try {
    JSON.parse(jsonString);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

/**
 * Mask sensitive values ใน object
 * @param {Object} obj - Object ที่ต้องการ mask
 * @param {Array<string>} sensitiveFields - Array ของ field names ที่ถือว่า sensitive
 * @returns {Object} Object ที่ mask แล้ว
 */
export const maskSensitiveInObject = (obj, sensitiveFields = []) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  const masked = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in masked) {
    if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveInObject(masked[key], sensitiveFields);
    } else {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some((field) =>
        lowerKey.includes(field.toLowerCase())
      );
      if (isSensitive && typeof masked[key] === 'string' && masked[key].length > 0) {
        masked[key] = '***';
      }
    }
  }

  return masked;
};

/**
 * Clone object deeply
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if two objects are deeply equal
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {boolean} True if equal
 */
export const deepEqual = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};









