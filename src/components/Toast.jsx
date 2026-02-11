import { useEffect } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

/**
 * Toast Notification Component
 * แสดง notification แบบ toast แทน alert
 */
const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="w-4 h-4" />;
      case 'error':
        return <X className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-500/20 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400';
      case 'error':
        return 'bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-500/20 border-yellow-200 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400';
      default:
        return 'bg-blue-50 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg animate-slide-in ${getStyles()} transition-colors`}
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="flex-shrink-0 ml-2 text-current opacity-70 hover:opacity-100 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;



