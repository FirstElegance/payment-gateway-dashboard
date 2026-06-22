# CLAUDE.md - Payment Gateway Dashboard

## What this project does

An admin dashboard for ELEGANCE Payment Gateway that monitors and manages payment transactions, fund transfers, bank registrations, QR payments, wallet operations, and member accounts across multiple Thai banks (SCB, KBANK, BBL, BAY, KTB). It provides real-time transaction flow charts, KPI metrics, bank configuration management, and a treasury monitoring view. The UI supports dark/light themes and auto-refresh at configurable intervals.

## Tech stack

- **Framework**: React 19 with Vite 7 (SPA, no SSR)
- **Styling**: Tailwind CSS v4 (via PostCSS plugin `@tailwindcss/postcss`), class-based dark mode (`@custom-variant dark`)
- **Routing**: React Router DOM v7 (nested `<Routes>`)
- **HTTP Client**: Axios with a shared `apiClient` instance (Basic auth, request/response interceptors)
- **Charts**: Chart.js + react-chartjs-2 (Doughnut), Lightweight Charts (TradingView-style `TransactionFlowTVChart`)
- **Icons**: lucide-react
- **Code Editor**: @monaco-editor/react (for JSON editing in bank config forms)
- **Date Handling**: date-fns, react-day-picker, react-datepicker
- **JSON Viewer**: react-json-view-lite
- **Fonts**: JetBrains Mono (monospace, primary body font), Noto Sans Thai, Inter

## Folder structure

```
payment-gateway-dashboard/
  index.html              # SPA entry point, title "EC Payment Gateway - Admin"
  vite.config.js          # Vite config with dev proxy (all non-static requests → backend)
  postcss.config.js       # Tailwind v4 PostCSS plugin + autoprefixer
  eslint.config.js        # Flat ESLint config (react-hooks, react-refresh)
  ex.json                 # Example/sample JSON file
  public/
    icon_bank/            # Static bank logo PNGs (BAY, BBL, KBANK, SCB, ec-logo)
    vite.svg
  src/
    main.jsx              # React 19 createRoot entry
    App.jsx               # Root component: providers → Router → routes
    App.css               # Minimal app-level CSS
    index.css             # Tailwind imports, custom fonts, dark mode scrollbar styles
    assets/               # Static assets (react.svg)
    components/           # All UI components (flat, no subdirectories)
      Layout.jsx          # Shell with top navbar, mobile menu, auto-refresh dropdown, theme toggle
      Dashboard.jsx       # Main dashboard: KPI cards, transaction flow chart, tabbed data tables
      Login.jsx           # Login page (username/password → POST /auth/login)
      Register.jsx        # Registration page
      ProtectedRoute.jsx  # Auth guard (redirects to /login if not authenticated)
      PaymentsList.jsx    # Standalone payments list page
      FundTransfersList.jsx
      BankRegistrationsList.jsx
      QrPaymentsList.jsx
      MembersList.jsx
      WalletTransactions.jsx
      BankConfigList.jsx  # Bank config CRUD list
      BankConfigView.jsx  # Read-only bank config detail
      BankConfigForm.jsx  # Create/edit bank config (with dynamic form generation)
      PaymentRegistrationsDashboard.jsx
      PaymentRegistrationsList.jsx
      TreasuryMonitor.jsx # Treasury balance monitoring
      TransactionFlowTVChart.jsx  # TradingView-style candlestick/line chart
      WalletFlowTVChart.jsx
      DynamicForm.jsx     # Renders form fields from auto-detected schema
      DynamicConfigForm.jsx
      JsonEditor.jsx      # Monaco-based JSON editor wrapper
      CertificateUploader.jsx  # File upload for PEM/CRT certificates
      Toast.jsx           # Individual toast notification
      ToastContainer.jsx  # Toast notification container
      AppLoading.jsx      # Loading spinner component
      DeleteModal.jsx     # Confirmation modal for delete actions
      *DetailModal.jsx    # Detail modals (Payment, FundTransfer, BankRegistration, QrPayment, Member)
    contexts/
      AuthContext.jsx     # Auth state (login/logout, localStorage persistence with 'elegance_' prefix)
      ThemeContext.jsx     # Dark/light theme (localStorage 'elegance_theme', system preference fallback)
      FeatureContext.jsx  # Feature flags derived from bank configs (e.g., qrPayment requires BILL_PAYMENT service)
      AutoRefreshContext.jsx  # Page auto-refresh at 3s/5s/10s intervals (full page reload via window.location.reload)
    hooks/
      useToast.js         # Toast notification hook (state-based, with auto-remove)
    services/
      api.js              # All API modules: bankConfigAPI, paymentRegistrationsAPI, fundTransfersAPI,
                          #   bankRegistrationsAPI, transferConfigAPI, qrPaymentAPI, membersAPI,
                          #   walletAPI, authAPI. Single axios instance with Basic auth from env.
    constants/
      bankConfig.js       # SERVICE_CODES, SENSITIVE_FIELDS, SERVICE_SCHEMAS (per-service form templates),
                          #   BANK_CODES, helper functions (isSensitiveField, maskSensitiveValue)
    utils/
      bankUtils.js        # BANK_CODE_MAP (code → name), getBankName, getBankDisplay
      jsonUtils.js        # formatJSON, validateJSON, maskSensitiveInObject, deepClone, deepEqual
      schemaDetector.js   # Auto-detect field types from config objects (cert, password, URL, etc.),
                          #   generateDynamicSchema, sortFieldsByPriority
      toast.js            # Imperative DOM-based toast (alternative to useToast hook)
```

## Scripts (package.json)

| Script    | Command         | Purpose                  |
|-----------|-----------------|--------------------------|
| `dev`     | `vite`          | Start dev server with proxy |
| `build`   | `vite build`    | Production build to `dist/` |
| `lint`    | `eslint .`      | Run ESLint on all files  |
| `preview` | `vite preview`  | Preview production build |

## Environment variables

- `VITE_PAYMENT_URL` - Backend API base URL (used as proxy target in dev, direct URL in prod)
- `VITE_PAYMENT_TOKEN` - Basic auth token (auto-prefixed with `Basic ` if missing)

## Coding patterns

### Component structure
- All components live in a flat `src/components/` directory (no nesting)
- Components are defined as `const ComponentName = () => { ... }` (arrow function components)
- Each file exports a single default component: `export default ComponentName`
- Components use Thai-language JSDoc comments for descriptions (e.g., `/** หน้า Login สำหรับเข้าสู่ระบบ */`)

### State management
- No external state library; all state is React Context + useState/useEffect
- Four context providers wrap the app in this order: ThemeProvider > AuthProvider > FeatureProvider > (inside ProtectedRoute) AutoRefreshProvider
- Auth tokens and user data persisted to localStorage with `elegance_` prefix keys

### API layer
- Single axios instance (`apiClient`) in `src/services/api.js` with all API modules exported as named objects
- Each API module is an object with async methods (e.g., `bankConfigAPI.getAll()`)
- API methods unwrap `.data` from axios response before returning
- Basic auth token injected via request interceptor
- In dev mode, Vite proxy forwards all non-static/non-HTML requests to `VITE_PAYMENT_URL`

### Data handling
- Dashboard loads all data upfront (up to 5000 records) and does client-side filtering, sorting, and pagination
- Transaction flow chart loads data independently from tables (separate pagination, up to 10,000 rows)
- Bank names are normalized from codes (014→SCB, 004→KBANK, 002→BBL, 025→BAY, 006→KTB)
- Amounts formatted as Thai Baht (฿) with 2 decimal places

### Styling
- Tailwind CSS v4 utility classes throughout (no CSS modules, no styled-components)
- Dark mode via `dark:` variant classes paired with a `.dark` class on `<html>`
- Monospace-first typography (JetBrains Mono as body font)
- Red-600 as the primary brand/accent color
- Responsive design with mobile hamburger menu (lg: breakpoint for desktop nav)

### File naming
- Components: PascalCase `.jsx` (e.g., `BankConfigForm.jsx`)
- Utilities/hooks/services: camelCase `.js` (e.g., `bankUtils.js`, `useToast.js`)
- Constants: camelCase `.js` (e.g., `bankConfig.js`)

### Feature flags
- Navigation items can require features (`requireFeature: 'qrPayment'`) or configs (`requireConfig: { bankCode, serviceCode }`)
- Features are derived from bank config data at runtime (e.g., QR Payments shown only if a `BILL_PAYMENT` service config exists)
- Wallet menu shown only if a `wallet/WALLET` config exists

### Bank config system
- Schema-less design: supports any service code and auto-detects field types from config object shape
- `schemaDetector.js` infers field types (certificate, password, URL, array, object, etc.) from key names and values
- Predefined schemas in `bankConfig.js` for known services (API_PAYMENT, BILL_PAYMENT, ODD_PAYMENT_STOP)
- Sensitive fields (passwords, keys, secrets) are masked in display with `***`

## Things a new dev should know

- The `.env` file (with `VITE_PAYMENT_URL` and `VITE_PAYMENT_TOKEN`) is gitignored and must be created locally
- In dev mode, the Vite proxy intercepts all API requests, so you don't need CORS configuration on the backend
- The proxy adds the Basic auth header automatically in dev; the axios interceptor also adds it, so the token appears twice — this is by design to work in both dev and prod
- Auto-refresh uses `window.location.reload()` (full page reload), not React state refresh
- The Dashboard component (`Dashboard.jsx`) is ~3100 lines — it's the largest file and contains the main dashboard with KPI cards, charts, and all four tabbed data tables inline
- There are two toast systems: a React hook-based one (`useToast.js` + `Toast.jsx`/`ToastContainer.jsx`) and an imperative DOM-based one (`utils/toast.js`). Both coexist in the codebase
- ESLint is configured with flat config format, ignoring unused vars that start with uppercase or underscore
- No test framework is set up — there are no test files in the project
- No TypeScript — the project uses plain JavaScript with `.jsx`/`.js` extensions (though `@types/react` is in devDependencies for editor IntelliSense)
- The project name in package.json is `pg-frontend`
