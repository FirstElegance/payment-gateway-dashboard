/**
 * Shared loading component - Logo + red spinning ring
 * ใช้ทั้งระบบสำหรับแสดงสถานะ loading
 */
const sizeClasses = {
  sm: { spinner: 'w-10 h-10 -m-1', img: 'w-6 h-6' },
  md: { spinner: 'w-16 h-16 -m-2', img: 'w-12 h-12' },
  lg: { spinner: 'w-20 h-20 -m-2.5', img: 'w-16 h-16' },
};

const AppLoading = ({ size = 'md', text, className = '' }) => {
  const { spinner, img } = sizeClasses[size] || sizeClasses.md;
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative">
        <div
          className={`absolute inset-0 border-4 border-red-200 dark:border-red-900/50 border-t-red-600 dark:border-t-red-500 rounded-full animate-spin ${spinner}`}
        />
        <img
          src="/icon_bank/ec-logo.png"
          alt="Loading"
          className={`relative object-contain ${img}`}
        />
      </div>
      {text && (
        <span className="mt-3 text-sm text-gray-600 dark:text-slate-400">
          {text}
        </span>
      )}
    </div>
  );
};

export default AppLoading;
