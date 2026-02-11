/**
 * Simple Toast Utility
 * สร้าง toast notification แบบง่าย
 */

const createToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  
  const styles = {
    success: 'bg-green-500/20 border-green-500/30 text-green-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  };

  toast.className = `fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg animate-slide-in flex items-center gap-2 ${styles[type] || styles.success}`;
  
  // Add icon
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
  toast.innerHTML = `<span class="font-bold">${icon}</span><span class="text-sm font-medium">${message}</span>`;
  
  document.body.appendChild(toast);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
};

export const toast = {
  success: (message) => createToast(message, 'success'),
  error: (message) => createToast(message, 'error'),
  warning: (message) => createToast(message, 'warning'),
  info: (message) => createToast(message, 'info'),
};



