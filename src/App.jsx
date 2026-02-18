import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FeatureProvider } from './contexts/FeatureContext';
import { AutoRefreshProvider } from './contexts/AutoRefreshContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import PaymentsList from './components/PaymentsList';
import FundTransfersList from './components/FundTransfersList';
import BankConfigList from './components/BankConfigList';
import BankConfigView from './components/BankConfigView';
import BankConfigForm from './components/BankConfigForm';
import BankRegistrationsList from './components/BankRegistrationsList';
import QrPaymentsList from './components/QrPaymentsList';
import MembersList from './components/MembersList';
import PaymentRegistrationsDashboard from './components/PaymentRegistrationsDashboard';
import TreasuryMonitor from './components/TreasuryMonitor';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeatureProvider>
        <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AutoRefreshProvider>
                <Layout>
                  <Routes>
                    {/* Dashboard - Main Page */}
                    <Route path="/" element={<Dashboard />} />
                    
                    {/* Payments Routes */}
                    <Route path="/payments" element={<PaymentsList />} />
                    
                    {/* Fund Transfers Routes */}
                    <Route path="/fund-transfers" element={<FundTransfersList />} />
                    
                    {/* Bank Registrations Routes */}
                    <Route path="/bank-registrations" element={<BankRegistrationsList />} />
                    
                    {/* QR Payments Routes */}
                    <Route path="/qr-payments" element={<QrPaymentsList />} />
                    
                    {/* Members Routes */}
                    <Route path="/members" element={<MembersList />} />
                    
                    {/* Bank Config Routes */}
                    <Route path="/bank-configs" element={<BankConfigList />} />
                    <Route path="/bank-configs/create" element={<BankConfigForm />} />
                    <Route path="/bank-configs/view/:bankCode/:serviceCode" element={<BankConfigView />} />
                    <Route path="/bank-configs/edit/:bankCode/:serviceCode" element={<BankConfigForm />} />
                    
                    {/* Payment Registrations Routes */}
                    <Route path="/payment-registrations" element={<PaymentRegistrationsDashboard />} />
                    
                    {/* Treasury Monitor */}
                    <Route path="/treasury" element={<TreasuryMonitor />} />
                    
                    {/* Catch all - redirect to dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
                </AutoRefreshProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
        </FeatureProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
