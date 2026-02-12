import axios from "axios";

// ใช้ proxy ใน development, production ใช้ URL จาก .env
const API_BASE_URL = import.meta.env.DEV
  ? "/api" // ใช้ /api เพื่อให้ proxy ทำงาน
  : import.meta.env.VITE_PAYMENT_URL || "";

// Default token จาก .env (fallback ถ้าไม่มี localStorage)
const DEFAULT_AUTH_TOKEN = import.meta.env.VITE_PAYMENT_TOKEN || "";

// Helper function to normalize token (ensure it has "Basic " prefix)
const normalizeToken = (token) => {
  if (!token) return null;
  return token.startsWith("Basic ") ? token : `Basic ${token}`;
};

// Get auth token from localStorage or use default
const getAuthToken = () => {
  const storedToken = localStorage.getItem("elegance_token");
  // If token already includes "Basic " prefix, use it directly, otherwise add it
  if (storedToken) {
    return normalizeToken(storedToken);
  }
  return normalizeToken(DEFAULT_AUTH_TOKEN);
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to each request
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    config.headers.Authorization = token;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);

    const errorMessage =
      error.response?.data?.message || error.message || "An error occurred";

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  },
);

export const bankConfigAPI = {
  getAll: async () => {
    const response = await apiClient.get("/bank-configs");
    return response.data;
  },

  getOne: async (bankCode, serviceCode) => {
    const response = await apiClient.get(
      `/bank-configs/${bankCode}/${serviceCode}`,
    );
    return response.data;
  },

  getProfileName: async () => {
    const response = await apiClient.get("/bank-configs/profile-name");
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post("/bank-configs", data);
    return response.data;
  },

  update: async (bankCode, serviceCode, data) => {
    const response = await apiClient.put(
      `/bank-configs/${bankCode}/${serviceCode}`,
      data,
    );
    return response.data;
  },

  delete: async (bankCode, serviceCode) => {
    await apiClient.delete(`/bank-configs/${bankCode}/${serviceCode}`);
  },
};

/**
 * ELEGANCE PAYMENT API Service
 * จัดการ operations สำหรับ ELEGANCE PAYMENT
 */
export const paymentRegistrationsAPI = {
  /**
   * ดึงข้อมูล ELEGANCE PAYMENT ทั้งหมด (with pagination and filters)
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @param {Object} filters - Filter parameters (bankCode, status, search, dateFrom, dateTo, amountMin, amountMax)
   * @returns {Promise<Object>} Object with data, total, page, limit
   */
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const params = { page, limit };

    // Add filters to params
    if (filters.bankCode && filters.bankCode !== "all")
      params.bankCode = filters.bankCode;
    if (filters.status && filters.status !== "all")
      params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.amountMin) params.amountMin = filters.amountMin;
    if (filters.amountMax) params.amountMax = filters.amountMax;

    const response = await apiClient.get("/bank-registrations/payments", {
      params,
    });
    return response.data;
  },

  /**
   * ดึงข้อมูล Payment ตาม ID
   * @param {string} id - Payment ID
   * @returns {Promise<Object>} Payment object
   */
  getById: async (id) => {
    const response = await apiClient.get(`/bank-registrations/payments/${id}`);
    return response.data;
  },

  /**
   * ดึงสถิติ Payments แยกตาม bank
   * @returns {Promise<Object>} Statistics by bank
   */
  getStats: async () => {
    const response = await apiClient.get("/bank-registrations/payments/stats");
    return response.data;
  },
};

/**
 * Fund Transfers API Service
 * จัดการ operations สำหรับ Fund Transfers
 */
export const fundTransfersAPI = {
  /**
   * ดึงข้อมูล Fund Transfers ทั้งหมด (with pagination and filters)
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @param {Object} filters - Filter parameters (bankCode, status, search, dateFrom, dateTo, amountMin, amountMax)
   * @returns {Promise<Object>} Object with data, total, page, limit
   */
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const params = { page, limit };

    // Add filters to params
    if (filters.bankCode && filters.bankCode !== "all")
      params.bankCode = filters.bankCode;
    if (filters.status && filters.status !== "all")
      params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.amountMin) params.amountMin = filters.amountMin;
    if (filters.amountMax) params.amountMax = filters.amountMax;

    const response = await apiClient.get("/bank-registrations/fund-transfers", {
      params,
    });
    return response.data;
  },

  /**
   * ดึงข้อมูล Fund Transfer ตาม ID
   * @param {string} id - Fund Transfer ID
   * @returns {Promise<Object>} Fund Transfer object
   */
  getById: async (id) => {
    const response = await apiClient.get(
      `/bank-registrations/fund-transfers/${id}`,
    );
    return response.data;
  },

  /**
   * ดึงสถิติ Fund Transfers แยกตาม bank
   * @returns {Promise<Object>} Statistics by bank
   */
  getStats: async () => {
    const response = await apiClient.get(
      "/bank-registrations/fund-transfers/stats",
    );
    return response.data;
  },
};

/**
 * Bank Registrations API Service
 * จัดการ operations สำหรับ Bank Registrations
 */
export const bankRegistrationsAPI = {
  /**
   * ดึงข้อมูล Bank Registrations ทั้งหมด (with pagination and filters)
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @param {Object} filters - Filter parameters (bankCode, status, search, dateFrom, dateTo)
   * @returns {Promise<Object>} Object with data, total, page, limit
   */
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const params = { page, limit };

    // Add filters to params
    if (filters.bankCode && filters.bankCode !== "all")
      params.bankCode = filters.bankCode;
    if (filters.status && filters.status !== "all")
      params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;

    const response = await apiClient.get("/bank-registrations", { params });
    return response.data;
  },

  /**
   * ดึงข้อมูล Bank Registration ตาม ID
   * @param {string} id - Bank Registration ID
   * @returns {Promise<Object>} Bank Registration object
   */
  getById: async (id) => {
    const response = await apiClient.get(`/bank-registrations/${id}`);
    return response.data;
  },

  /**
   * ดึงสถิติ Bank Registrations แยกตาม bank
   * @returns {Promise<Object>} Statistics by bank
   */
  getStats: async () => {
    const response = await apiClient.get("/bank-registrations/stats");
    return response.data;
  },
};

/**
 * Transfer Config API Service
 * จัดการ operations สำหรับ Transfer Config Bank Info
 */
export const transferConfigAPI = {
  /**
   * ดึงข้อมูล Bank Info ทั้งหมด
   * @returns {Promise<Object>} Object with bankSummaries and totals
   */
  getBankInfo: async () => {
    const response = await apiClient.get("/transfer-config/bank-info");
    // Response structure: { success: true, data: { bankSummaries: [...], totals: {...} } }
    return response.data?.data || { bankSummaries: [], totals: {} };
  },

  /**
   * ดึงข้อมูล Bank Info สำหรับ Export
   * @returns {Promise<Array>} Array of bank info for export
   */
  getBankInfoExport: async () => {
    const response = await apiClient.get(
      "/transfer-config/bank-info?type=export",
    );
    return response.data?.data || [];
  },

  /**
   * ดึงข้อมูล Bank Info สำหรับ Import
   * @returns {Promise<Array>} Array of bank info for import
   */
  getBankInfoImport: async () => {
    const response = await apiClient.get(
      "/transfer-config/bank-info?type=import",
    );
    return response.data?.data || [];
  },

  /**
   * ดึงรายชื่อธนาคารทั้งหมด (รวมทั้งที่ปิดด้วย)
   * @param {boolean} showAll - แสดงทั้งหมดหรือไม่ (default: true)
   * @returns {Promise<Array>} Array of bank objects with bankNameEng, bankNameThai, bankCode
   */
  getBankList: async (showAll = true) => {
    const params = showAll ? { showAll: true } : {};
    const response = await apiClient.get("/transfer-config/bank-list", {
      params,
    });
    // Response is array directly: [{ bankNameEng, bankNameThai, bankCode, ... }, ...]
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * เปิด/ปิด สถานะธนาคาร (Toggle)
   * @param {string} id - Bank ID
   * @returns {Promise<Object>} Updated bank object
   */
  toggleBankActive: async (id) => {
    const response = await apiClient.put(
      `/transfer-config/show-bank/${id}/toggle`,
    );
    return response.data;
  },
};

/**
 * QR Payment API Service
 * จัดการ operations สำหรับ QR Payment
 */
export const qrPaymentAPI = {
  /**
   * ดึงข้อมูล QR Payments ทั้งหมด (with pagination)
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @returns {Promise<Object>} Object with data, total, page, limit
   */
  getAll: async (page = 1, limit = 10) => {
    const response = await apiClient.get("/transfer/generate-qr", {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * ดึงข้อมูล QR Payment ตาม ID
   * @param {string} id - QR Payment ID
   * @returns {Promise<Object>} QR Payment object
   */
  getById: async (id) => {
    const response = await apiClient.get(`/transfer/generate-qr/${id}`);
    return response.data;
  },
};

/**
 * Members API Service
 * จัดการ operations สำหรับ Members
 */
export const membersAPI = {
  /**
   * ดึงข้อมูล Members ทั้งหมด
   * @returns {Promise<Array>} Array of member objects
   */
  getAll: async () => {
    const response = await apiClient.get("/members");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * ดึงข้อมูล Member ตาม ID
   * @param {string} memberId - Member ID
   * @returns {Promise<Object>} Member object with related data
   */
  getById: async (memberId) => {
    const response = await apiClient.get(`/members/${memberId}`);
    return response.data;
  },
};

/**
 * Auth API Service
 * จัดการ operations สำหรับ Authentication
 */
export const authAPI = {
  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Register response
   */
  register: async (userData) => {
    const response = await apiClient.post("/auth/register", userData);
    return response.data;
  },

  /**
   * Login
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Login response with token
   */
  login: async (username, password) => {
    const response = await apiClient.post("/auth/login", {
      username,
      password,
    });
    return response.data;
  },
};

export default apiClient;
