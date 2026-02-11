/**
 * Bank Utilities
 * ฟังก์ชันช่วยเหลือสำหรับจัดการข้อมูลธนาคาร
 */

/**
 * Bank code mapping to bank names
 */
export const BANK_CODE_MAP = {
  "014": "Siam Commercial Bank (SCB)",
  "004": "Kasikornbank (KBank)",
  "002": "Bangkok Bank (BBL)",
  "006": "Krungthai Bank (KTB)",
  "025": "Bank of Ayudhya (BAY)",
};

/**
 * Get bank name from bank code
 * @param {string} bankCode - Bank code (e.g., '014', '004')
 * @returns {string} Bank name or bank code if not found
 */
export const getBankName = (bankCode) => {
  if (!bankCode) return "-";
  return BANK_CODE_MAP[bankCode] || bankCode;
};

/**
 * Get bank display text (name with code)
 * @param {string} bankCode - Bank code
 * @param {string} bankName - Optional existing bank name from API
 * @returns {string} Formatted bank display text
 */
export const getBankDisplay = (bankCode, bankName = null) => {
  if (!bankCode) return "-";
  const mappedName = BANK_CODE_MAP[bankCode];
  if (mappedName) {
    return `${mappedName}`;
  }
  // If API provides bank name, use it with code
  if (bankName) {
    return `${bankName} (${bankCode})`;
  }
  return bankCode;
};

/**
 * Get bank code only (for display when name is shown separately)
 * @param {string} bankCode - Bank code
 * @returns {string} Bank code or '-'
 */
export const getBankCodeDisplay = (bankCode) => {
  if (!bankCode) return "-";
  return bankCode;
};
