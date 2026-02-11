import Toast from './Toast';
import { useToast } from '../hooks/useToast';

/**
 * Toast Container Component
 * แสดง Toast notifications ทั้งหมด
 */
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;



