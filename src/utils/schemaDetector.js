/**
 * Schema Detector Utility
 * Auto-detect field types from config object
 * ไม่ต้องมี hardcoded schema - detect จาก key name และ value type
 */

/**
 * Convert camelCase/snake_case to Title Case
 * Example: "urlToken" → "Url Token", "merchant_id" → "Merchant Id"
 */
export const toTitleCase = (str) => {
  // Special cases
  if (str === "soapWsdlUrl") {
    return "Url KBANK Service (ODD Payment) (Legacy)";
  }

  return (
    str
      // camelCase → spaces
      .replace(/([A-Z])/g, " $1")
      // snake_case → spaces
      .replace(/_/g, " ")
      // Trim and capitalize
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  );
};

/**
 * Detect if field is a certificate or key file
 */
const isCertOrKeyField = (key, value) => {
  const lowerKey = key.toLowerCase();

  // Check key name
  const isCertKey =
    lowerKey.includes("cert") ||
    lowerKey.includes("certificate") ||
    (lowerKey.includes("key") && !lowerKey.includes("url"));

  if (!isCertKey) return false;

  // Check value content
  if (typeof value !== "string") return false;

  return value.includes("BEGIN") || value.includes("END") || value.length > 100;
};

/**
 * Detect if field is password/secret
 */
const isPasswordField = (key) => {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey.includes("secret") ||
    lowerKey.includes("password") ||
    lowerKey.includes("passphrase") ||
    lowerKey.includes("passwd") ||
    lowerKey.includes("pwd")
  );
};

/**
 * Detect if field is URL
 */
const isUrlField = (key, value) => {
  const lowerKey = key.toLowerCase();

  // Check key name
  if (lowerKey.includes("url") || lowerKey.includes("endpoint")) {
    return true;
  }

  // Check value format
  if (typeof value === "string") {
    return value.startsWith("http://") || value.startsWith("https://");
  }

  return false;
};

/**
 * Detect field type and return configuration
 */
export const detectFieldConfig = (key, value) => {
  // Certificate or Key file
  if (isCertOrKeyField(key, value)) {
    return {
      type: "file",
      accept: ".pem,.key,.crt,.cer,.txt",
      label: toTitleCase(key),
      required: false,
      isSecret: true,
      placeholder: `Upload ${key} file or paste content`,
      help: `Upload .pem/.key/.crt file or paste the content directly`,
    };
  }

  // Password/Secret field
  if (isPasswordField(key)) {
    return {
      type: "password",
      label: toTitleCase(key),
      required: false,
      isSecret: true,
      placeholder: "Enter " + toTitleCase(key).toLowerCase(),
    };
  }

  // URL field
  if (isUrlField(key, value)) {
    return {
      type: "url",
      label: toTitleCase(key),
      required: false,
      placeholder: "https://example.com/api/...",
    };
  }

  // Array field
  if (Array.isArray(value)) {
    return {
      type: "array",
      label: toTitleCase(key),
      required: false,
    };
  }

  // Object field
  if (typeof value === "object" && value !== null) {
    return {
      type: "object",
      label: toTitleCase(key),
      required: false,
    };
  }

  // Boolean field
  if (typeof value === "boolean") {
    return {
      type: "boolean",
      label: toTitleCase(key),
      required: false,
    };
  }

  // Number field
  if (typeof value === "number") {
    return {
      type: "number",
      label: toTitleCase(key),
      required: false,
      placeholder: "Enter number",
    };
  }

  // Default: text field
  return {
    type: "text",
    label: toTitleCase(key),
    required: false,
    placeholder: "Enter " + toTitleCase(key).toLowerCase(),
  };
};

/**
 * Generate dynamic schema from config object
 */
export const generateDynamicSchema = (configObject) => {
  if (!configObject || typeof configObject !== "object") {
    return {};
  }

  const schema = {};

  for (const [key, value] of Object.entries(configObject)) {
    schema[key] = {
      ...detectFieldConfig(key, value),
      value: value,
    };
  }

  return schema;
};

/**
 * Sort fields by type priority
 * Priority: file > password > url > text > number > boolean > array > object
 */
export const sortFieldsByPriority = (schema) => {
  const priority = {
    file: 1,
    password: 2,
    url: 3,
    text: 4,
    number: 5,
    boolean: 6,
    array: 7,
    object: 8,
  };

  return Object.entries(schema).sort(([, a], [, b]) => {
    return (priority[a.type] || 999) - (priority[b.type] || 999);
  });
};

/**
 * Check if field should be masked in display
 */
export const shouldMaskField = (fieldConfig) => {
  return fieldConfig.isSecret === true;
};
