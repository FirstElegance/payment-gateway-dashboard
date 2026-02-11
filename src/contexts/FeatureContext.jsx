import { createContext, useContext, useState, useEffect } from 'react';
import { bankConfigAPI } from '../services/api';

/**
 * Feature Context
 * จัดการ feature flags โดยเช็คจาก bank configs
 */
const FeatureContext = createContext(null);

export const useFeatures = () => {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
};

export const FeatureProvider = ({ children }) => {
  const [features, setFeatures] = useState({
    qrPayment: false,  // มี BILL_PAYMENT หรือไม่
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFeatures();
  }, []);

  const checkFeatures = async () => {
    try {
      setLoading(true);
      const configs = await bankConfigAPI.getAll();
      
      // เช็คว่ามี BILL_PAYMENT หรือไม่ (ไม่สนว่า bankCode อะไร)
      const hasBillPayment = Array.isArray(configs) 
        ? configs.some(config => config.serviceCode === 'BILL_PAYMENT')
        : false;
      
      setFeatures({
        qrPayment: hasBillPayment,
      });
    } catch (error) {
      console.error('Error checking features:', error);
      // ถ้า error ให้ปิด features ทั้งหมด
      setFeatures({
        qrPayment: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const value = {
    features,
    loading,
    checkFeatures, // สำหรับ refresh
  };

  return (
    <FeatureContext.Provider value={value}>
      {children}
    </FeatureContext.Provider>
  );
};
