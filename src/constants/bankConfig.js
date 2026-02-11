/**
 * Bank Configuration Constants
 * เก็บค่าคงที่ต่างๆ สำหรับ Bank Config system
 */

// Service Codes ที่รองรับ
// Note: ระบบเป็น Schema-less แล้ว - รองรับทุก service code โดยอัตโนมัติ
// List นี้ใช้สำหรับแสดงใน dropdown เท่านั้น
export const SERVICE_CODES = [
  "API_PAYMENT",
  "BILL_PAYMENT",
  "ODD_PAYMENT",
  "ODD_PAYMENT_UAT",
  "ODD_PAYMENT_SANDBOX",
  "ODD_PAYMENT_STOP",
  "PAYMENT_GATEWAY",
];

// Fields ที่ถูกพิจารณาว่าเป็น sensitive (จะถูก mask)
export const SENSITIVE_FIELDS = [
  "password",
  "passPhrase",
  "passphrase",
  "secret",
  "key",
  "cert",
  "privateKey",
  "consumerSecret",
  "applicationSecret",
  "apiKey",
  "token",
];

// Schema templates สำหรับแต่ละ service code (สำหรับ Dynamic Form)
export const SERVICE_SCHEMAS = {
  ODD_PAYMENT_STOP: {
    logo_url: { type: "url", label: "Logo URL", required: false },
    ddyPayUrl: { type: "url", label: "DDY Pay URL", required: true },
    passPhrase: { type: "password", label: "Pass Phrase", required: true },
    registerUrl: { type: "url", label: "Register URL", required: true },
    callback_url: { type: "url", label: "Callback URL", required: true },
    service_name: { type: "text", label: "Service Name", required: true },
    corporateName: { type: "text", label: "Corporate Name", required: true },
  },
  BILL_PAYMENT: {
    urlToken: { type: "url", label: "URL Token", required: true },
    merchantInfo: {
      type: "array",
      label: "Merchant Info",
      required: true,
      itemSchema: {
        ppId: { type: "text", label: "PP ID", required: true },
        billerId: { type: "text", label: "Biller ID", required: true },
        branchName: { type: "text", label: "Branch Name", required: true },
        merchantId: { type: "text", label: "Merchant ID", required: true },
      },
    },
    applicationKey: {
      type: "password",
      label: "Application Key",
      required: true,
    },
    applicationSecret: {
      type: "password",
      label: "Application Secret",
      required: true,
    },
  },
  API_PAYMENT: {
    key: {
      type: "certificate",
      label: "Private Key",
      required: true,
      accept: ".pem,.key,.txt",
      placeholder:
        "Paste your private key here (-----BEGIN RSA PRIVATE KEY-----...)",
      help: "Upload your privateKey.pem file or paste the content manually",
    },
    cert: {
      type: "certificate",
      label: "Certificate",
      required: true,
      accept: ".crt,.pem,.cer,.txt",
      placeholder:
        "Paste your certificate here (-----BEGIN CERTIFICATE-----...)",
      help: "Upload your certificate.crt file or paste the content manually",
    },
    urlToken: { type: "url", label: "URL Token", required: true },
    taxId: { type: "text", label: "Tax ID", required: false },
    accountNo: { type: "text", label: "Account Number", required: false },
    confirmUrl: { type: "url", label: "Confirm URL", required: false },
    inquiryUrl: { type: "url", label: "Inquiry URL", required: false },
    merchantID: { type: "text", label: "Merchant ID", required: false },
    urlpayment: { type: "url", label: "Payment URL", required: false },
    corporateId: { type: "text", label: "Corporate ID", required: false },
    corporateName: { type: "text", label: "Corporate Name", required: false },
    applicationKey: {
      type: "password",
      label: "Application Key",
      required: false,
    },
    applicationSecret: {
      type: "password",
      label: "Application Secret",
      required: false,
    },
    consumerId: { type: "text", label: "Consumer ID", required: false },
    consumerSecret: {
      type: "password",
      label: "Consumer Secret",
      required: false,
    },
  },
  ODD_PAYMENT: {
    // สามารถเพิ่ม schema ได้ตามต้องการ
  },
  PAYMENT_GATEWAY: {
    // สามารถเพิ่ม schema ได้ตามต้องการ
  },
};

// ตัวอย่าง Bank Codes (สามารถดึงจาก API ได้)
export const BANK_CODES = [
  "004", // KBANK
  "014", // SCB
  "002", // BBL
  "006", // KTB
  "025", // BAY
  "000", // PAYMENT_GATEWAY
  "KBANK",
  "SCB",
  "BBL",
  "KTB",
  "BAY",
  "TMB",
  "CIMB",
  "TISCO",
  "UOB",
  "LH BANK",
];

// Helper function: ตรวจสอบว่า field เป็น sensitive หรือไม่
export const isSensitiveField = (fieldName) => {
  const lowerFieldName = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some((sensitive) =>
    lowerFieldName.includes(sensitive.toLowerCase())
  );
};

// Helper function: Mask sensitive values
export const maskSensitiveValue = (value) => {
  if (typeof value !== "string") return "***";
  if (value.length === 0) return "***";
  if (value.length <= 4) return "***";
  // แสดง 2 ตัวแรกและ 2 ตัวสุดท้าย
  return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
};
