import { Fragment } from 'react';

/**
 * Delete Confirmation Modal Component
 * Modal สำหรับยืนยันการลบ Bank Config
 */
const DeleteModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  bankCode, 
  serviceCode,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800 transition-colors">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">
              Confirm Delete
            </h3>
            <button
              onClick={onClose}
              disabled={isLoading}
              title="Close"
              className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 disabled:opacity-50 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="mb-6">
            <p className="text-gray-700 dark:text-slate-300 mb-4 transition-colors">
              Are you sure you want to delete this Bank Configuration?
            </p>
            
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded p-4 transition-colors">
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="font-semibold text-gray-700 dark:text-slate-300 w-32 transition-colors">Bank Code:</span>
                  <span className="text-gray-900 dark:text-white transition-colors">{bankCode}</span>
                </div>
                <div className="flex">
                  <span className="font-semibold text-gray-700 dark:text-slate-300 w-32 transition-colors">Service Code:</span>
                  <span className="text-gray-900 dark:text-white transition-colors">{serviceCode}</span>
                </div>
              </div>
            </div>

            <p className="text-red-600 dark:text-red-400 text-sm mt-4 font-semibold transition-colors">
              ⚠️ This action cannot be undone.
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              title="Cancel and close"
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              title="Confirm delete"
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;









