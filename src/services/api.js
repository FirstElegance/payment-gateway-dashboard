import axios from "axios";

/**
 * ===============================
 * BASE URL CONFIG
 * ===============================
 */
const normalizeBaseUrl = (url) => (url || "").replace(/\/$/, "");

// Dev: relative paths → Vite proxy → VITE_PAYMENT_URL (no /api prefix)
// Prod: full backend URL from env
const API_BASE_URL = import.meta.env.DEV
  ? ""
  : normalizeBaseUrl(import.meta.env.VITE_PAYMENT_URL);

/**
 * ===============================
 * TOKEN CONFIG
 * ===============================
 */
const DEFAULT_AUTH_TOKEN = import.meta.env.VITE_PAYMENT_TOKEN || "";

const normalizeBasicToken = (token) => {
  if (!token) return null;
  const raw = token.replace(/^Basic\s+/i, "").trim();
  return `Basic ${raw}`;
};

export const normalizeBearerToken = (token) => {
  if (!token) return null;
  const raw = token.replace(/^Bearer\s+/i, "").trim();
  return `Bearer ${raw}`;
};

export const stripAuthScheme = (token) =>
  (token || "").replace(/^(Basic|Bearer)\s+/i, "").trim();

const LOGIN_TYPE_KEY = "elegance_login_type";
const SESSION_TOKEN_KEY = "elegance_token";
const USER_KEY = "elegance_user";
const SUPER_ADMIN_ROLE = "Super-Admin";

export const hasSuperAdminRole = (roles) => {
  if (Array.isArray(roles)) {
    return roles.includes(SUPER_ADMIN_ROLE);
  }
  return roles === SUPER_ADMIN_ROLE;
};
export const SELECTED_PORTAL_KEY = "elegance_selected_portal";
const PORTAL_DEV_PREFIX = "/__portal__";

const encodePortalDevPrefix = (merchantUrl) => {
  const origin = normalizeBaseUrl(merchantUrl);
  const encoded = btoa(origin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${PORTAL_DEV_PREFIX}/${encoded}`;
};

export const getSelectedPortal = () => {
  try {
    const raw = localStorage.getItem(SELECTED_PORTAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ใช้ merchant ที่เลือกได้เฉพาะ session superadmin เท่านั้น
const getActiveSelectedPortal = () => {
  if (localStorage.getItem(LOGIN_TYPE_KEY) !== "superadmin") {
    return null;
  }
  return getSelectedPortal();
};

// Portal dashboard ปกติ → .env | Super Admin เลือก merchant → URL/token จาก card
const applyMerchantPortalConfig = (config, selected, requestUrl) => {
  const merchantUrl = normalizeBaseUrl(selected.vitePaymentUrl);
  const apiPath = requestUrl.startsWith("/") ? requestUrl : `/${requestUrl}`;

  if (import.meta.env.DEV) {
    config.baseURL = "";
    config.url = `${encodePortalDevPrefix(merchantUrl)}${apiPath}`;
  } else {
    config.baseURL = merchantUrl;
  }

  if (selected.vitePaymentToken) {
    config.headers.Authorization = normalizeBasicToken(selected.vitePaymentToken);
  } else {
    delete config.headers.Authorization;
  }
};

const applyEnvPortalConfig = (config) => {
  config.baseURL = API_BASE_URL;

  const token = import.meta.env.VITE_PAYMENT_TOKEN;
  if (token) {
    config.headers.Authorization = normalizeBasicToken(token);
  } else {
    delete config.headers.Authorization;
  }
};

// GET /portalbanking → Authorization: Bearer <token> จาก superadmin login
const getSuperAdminBearerToken = () => {
  const loginType = localStorage.getItem(LOGIN_TYPE_KEY);
  const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);

  if (loginType !== "superadmin" || !sessionToken) {
    return null;
  }

  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || "{}");
    if (!hasSuperAdminRole(user.roles)) {
      return null;
    }
  } catch {
    return null;
  }

  return normalizeBearerToken(sessionToken);
};

const isPortalBankingRequest = (url = "") =>
  url === "/portalbanking" || url.startsWith("/portalbanking/");

const isAuthRequest = (url = "") =>
  url === "/auth" || url.startsWith("/auth/");

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
    const requestUrl = config.url || "";

    if (isPortalBankingRequest(requestUrl)) {
      config.baseURL = API_BASE_URL;
      const bearerToken = getSuperAdminBearerToken();
      if (bearerToken) {
        config.headers.Authorization = bearerToken;
      } else {
        delete config.headers.Authorization;
      }
      return config;
    }

    // /auth/* ใช้ backend จาก .env เสมอ (superadmin login, register)
    if (isAuthRequest(requestUrl)) {
      applyEnvPortalConfig(config);
      return config;
    }

    const selected = getActiveSelectedPortal();
    if (selected?.vitePaymentUrl) {
      applyMerchantPortalConfig(config, selected, requestUrl);
      return config;
    }

    applyEnvPortalConfig(config);
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
 * WALLET API
 * ========================================================
 */
export const walletAPI = {
  // Get all wallets (with memberName)
  getAllWallets: async () =>
    (await apiClient.get("/wallet")).data,

  // Get wallet by ID (with memberName)
  getWalletById: async (walletId) =>
    (await apiClient.get(`/wallet/wallet-id/${walletId}`)).data,

  // Get all transactions (with optional pagination or ref search)
  getAllTransactions: async (params = {}) =>
    (await apiClient.get("/wallet/transactions", { params })).data,

  // Get all deposits (with optional pagination)
  getAllDeposits: async (params = {}) =>
    (await apiClient.get("/wallet/deposits", { params })).data,

  // Get all withdrawals (with optional pagination)
  getAllWithdrawals: async (params = {}) =>
    (await apiClient.get("/wallet/withdrawals", { params })).data,

  // Get transaction details by ID
  getTransactionById: async (transactionId) =>
    (await apiClient.get(`/wallet/transactions/${transactionId}`)).data,

  getDepositById: async (depositId) =>
    (await apiClient.get(`/wallet/deposits/${depositId}`)).data,

  getWithdrawalById: async (withdrawalId) =>
    (await apiClient.get(`/wallet/withdrawals/${withdrawalId}`)).data,

  // Get member history with filters (NEW unified endpoint)
  getMemberHistory: async (memberId, params = {}) => {
    // params: { filter: 'all' | 'deposits' | 'withdrawals', startDate, endDate, limit }
    return (await apiClient.get(`/wallet/by-member/${memberId}/history`, { params })).data;
  },

  // Get transaction by ref (alias for backward compatibility)
  getByRef: async (ref) =>
    (await apiClient.get("/wallet/transactions", { params: { ref } })).data,

  // Get Wallets
  getMemberWallets: async (memberId) =>
    (await apiClient.get(`/wallet/by-member/${memberId}`)).data,

  getActiveMemberWallet: async (memberId) =>
    (await apiClient.get(`/wallet/active/${memberId}`)).data,

  // Deposit & Withdraw Actions
  deposit: async (data) =>
    (await apiClient.post("/wallet/deposit", data)).data,

  withdraw: async (data) =>
    (await apiClient.post("/wallet/withdraw", data)).data,

  // Transactions By Member ID
  getMemberTransactions: async (memberId, limit, offset) =>
    (await apiClient.get(`/wallet/by-member/${memberId}/transactions`, {
      params: { limit, offset },
    })).data,

  getMemberDeposits: async (memberId) =>
    (await apiClient.get(`/wallet/by-member/${memberId}/deposits`)).data,

  getMemberWithdrawals: async (memberId) =>
    (await apiClient.get(`/wallet/by-member/${memberId}/withdrawals`)).data,

  // By Wallet ID
  getWalletTransactions: async (walletId) =>
    (await apiClient.get(`/wallet/wallet-id/${walletId}/transactions`)).data,

  getWalletDeposits: async (walletId) =>
    (await apiClient.get(`/wallet/wallet-id/${walletId}/deposits`)).data,

  getWalletWithdrawals: async (walletId) =>
    (await apiClient.get(`/wallet/wallet-id/${walletId}/withdrawals`)).data,

  // Merchant Wallets
  getMerchantWallets: async () =>
    (await apiClient.get("/wallet/merchant")).data,

  getActiveMerchantWallet: async () =>
    (await apiClient.get("/wallet/merchant/active")).data,

  // Merchant Active Transactions
  getMerchantActiveTransactions: async () =>
    (await apiClient.get("/wallet/merchant/active/transactions")).data,

  getMerchantActiveDeposits: async () =>
    (await apiClient.get("/wallet/merchant/active/deposits")).data,

  getMerchantActiveWithdrawals: async () =>
    (await apiClient.get("/wallet/merchant/active/withdrawals")).data,

  // By Merchant Member ID
  getMerchantTransactions: async (merchantMemberId) =>
    (await apiClient.get(`/wallet/merchant/${merchantMemberId}/transactions`))
      .data,

  getMerchantDeposits: async (merchantMemberId) =>
    (await apiClient.get(`/wallet/merchant/${merchantMemberId}/deposits`)).data,

  getMerchantWithdrawals: async (merchantMemberId) =>
    (await apiClient.get(`/wallet/merchant/${merchantMemberId}/withdrawals`))
      .data,
};

/**
 * ========================================================
 * PORTAL BANKING API (Super Admin)
 * ========================================================
 */
export const portalBankingAPI = {
  getAll: async () => (await apiClient.get("/portalbanking")).data,

  getById: async (id) => (await apiClient.get(`/portalbanking/${id}`)).data,

  create: async (data) => (await apiClient.post("/portalbanking", data)).data,

  update: async (id, data) =>
    (await apiClient.put(`/portalbanking/${id}`, data)).data,

  delete: async (id) => apiClient.delete(`/portalbanking/${id}`),
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
