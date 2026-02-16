import axios from "axios";

/**
 * ===============================
 * BASE URL CONFIG
 * ===============================
 */
const API_BASE_URL = import.meta.env.DEV
  ? "/api"
  : import.meta.env.VITE_PAYMENT_URL || "";

/**
 * ===============================
 * TOKEN CONFIG
 * ===============================
 */
const DEFAULT_AUTH_TOKEN = import.meta.env.VITE_PAYMENT_TOKEN || "";

const normalizeToken = (token) => {
  if (!token) return null;
  return token.startsWith("Basic ") ? token : `Basic ${token}`;
};

// ใช้ Basic token เดียวจาก .env
const getAuthToken = () => {
  return `Basic ${import.meta.env.VITE_PAYMENT_TOKEN}`;
};

/**
 * ===============================
 * AXIOS INSTANCE
 * ===============================
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * ===============================
 * REQUEST INTERCEPTOR
 * ===============================
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();

    if (token) {
      config.headers.Authorization = token;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * ===============================
 * RESPONSE INTERCEPTOR
 * ===============================
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);

    return Promise.reject({
      message:
        error.response?.data?.message || error.message || "An error occurred",
      status: error.response?.status,
      data: error.response?.data,
    });
  },
);

/**
 * ========================================================
 * BANK CONFIG API
 * ========================================================
 */
export const bankConfigAPI = {
  getAll: async () => (await apiClient.get("/bank-configs")).data,

  getOne: async (bankCode, serviceCode) =>
    (await apiClient.get(`/bank-configs/${bankCode}/${serviceCode}`)).data,

  getProfileName: async () =>
    (await apiClient.get("/bank-configs/profile-name")).data,

  create: async (data) => (await apiClient.post("/bank-configs", data)).data,

  update: async (bankCode, serviceCode, data) =>
    (await apiClient.put(`/bank-configs/${bankCode}/${serviceCode}`, data))
      .data,

  delete: async (bankCode, serviceCode) =>
    apiClient.delete(`/bank-configs/${bankCode}/${serviceCode}`),
};

/**
 * ========================================================
 * PAYMENT REGISTRATIONS API
 * ========================================================
 */
export const paymentRegistrationsAPI = {
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const params = { page, limit, ...filters };
    return (await apiClient.get("/bank-registrations/payments", { params }))
      .data;
  },

  getById: async (id) =>
    (await apiClient.get(`/bank-registrations/payments/${id}`)).data,

  getStats: async () =>
    (await apiClient.get("/bank-registrations/payments/stats")).data,
};

/**
 * ========================================================
 * FUND TRANSFERS API
 * ========================================================
 */
export const fundTransfersAPI = {
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const params = { page, limit, ...filters };
    return (
      await apiClient.get("/bank-registrations/fund-transfers", { params })
    ).data;
  },

  getById: async (id) =>
    (await apiClient.get(`/bank-registrations/fund-transfers/${id}`)).data,

  getStats: async () =>
    (await apiClient.get("/bank-registrations/fund-transfers/stats")).data,
};

/**
 * ========================================================
 * BANK REGISTRATIONS API
 * ========================================================
 */
export const bankRegistrationsAPI = {
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const params = { page, limit, ...filters };
    return (await apiClient.get("/bank-registrations", { params })).data;
  },

  getById: async (id) =>
    (await apiClient.get(`/bank-registrations/${id}`)).data,

  getStats: async () => (await apiClient.get("/bank-registrations/stats")).data,
};

/**
 * ========================================================
 * TRANSFER CONFIG API
 * ========================================================
 */
export const transferConfigAPI = {
  getBankInfo: async () =>
    (await apiClient.get("/transfer-config/bank-info")).data?.data ?? {
      bankSummaries: [],
      totals: {},
    },

  getBankInfoExport: async () =>
    (await apiClient.get("/transfer-config/bank-info?type=export")).data
      ?.data ?? [],

  getBankInfoImport: async () =>
    (await apiClient.get("/transfer-config/bank-info?type=import")).data
      ?.data ?? [],

  getBankList: async (showAll = true) =>
    (
      await apiClient.get("/transfer-config/bank-list", {
        params: showAll ? { showAll: true } : {},
      })
    ).data ?? [],

  toggleBankActive: async (id) =>
    (await apiClient.put(`/transfer-config/show-bank/${id}/toggle`)).data,
};

/**
 * ========================================================
 * QR PAYMENT API
 * ========================================================
 */
export const qrPaymentAPI = {
  getAll: async (page = 1, limit = 10) =>
    (
      await apiClient.get("/transfer/generate-qr", {
        params: { page, limit },
      })
    ).data,

  getById: async (id) =>
    (await apiClient.get(`/transfer/generate-qr/${id}`)).data,
};

/**
 * ========================================================
 * MEMBERS API
 * ========================================================
 */
export const membersAPI = {
  getAll: async () => (await apiClient.get("/members")).data,

  getById: async (memberId) =>
    (await apiClient.get(`/members/${memberId}`)).data,
};

/**
 * ========================================================
 * AUTH API
 * ========================================================
 */
export const authAPI = {
  register: async (userData) =>
    (await apiClient.post("/auth/register", userData)).data,

  login: async (username, password) =>
    (await apiClient.post("/auth/login", { username, password })).data,
};

export default apiClient;
