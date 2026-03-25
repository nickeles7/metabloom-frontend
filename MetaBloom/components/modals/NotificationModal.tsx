import React from "react";
import { PiCheckCircle, PiWarning, PiX, PiInfo } from "react-icons/pi";
import { useMainModal } from "@/stores/modal";

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationModalProps {
  type?: NotificationType;
  title?: string;
  message?: string;
  onConfirm?: () => void;
  confirmText?: string;
  showCancel?: boolean;
  cancelText?: string;
}

function NotificationModal() {
  const { modalClose, modalParams } = useMainModal();

  const {
    type = 'info',
    title = 'Notification',
    message = '',
    onConfirm,
    confirmText = 'OK',
    showCancel = false,
    cancelText = 'Cancel'
  }: NotificationModalProps = modalParams;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <PiCheckCircle className="text-2xl text-green-600 dark:text-green-400" />;
      case 'error':
        return <PiX className="text-2xl text-red-600 dark:text-red-400" />;
      case 'warning':
        return <PiWarning className="text-2xl text-orange-600 dark:text-orange-400" />;
      default:
        return <PiInfo className="text-2xl text-blue-600 dark:text-blue-400" />;
    }
  };

  const getIconBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/20';
      case 'warning':
        return 'bg-orange-100 dark:bg-orange-900/20';
      default:
        return 'bg-blue-100 dark:bg-blue-900/20';
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      case 'warning':
        return 'bg-orange-600 hover:bg-orange-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    modalClose();
  };

  const handleCancel = () => {
    modalClose();
  };

  return (
    <div className="max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-full ${getIconBgColor()}`}>
          {getIcon()}
        </div>
        <h2 className="text-lg font-semibold text-n700 dark:text-n30">
          {title}
        </h2>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-4">
          <p className="text-sm text-n600 dark:text-n400 whitespace-pre-line">
            {message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {showCancel && (
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-n600 dark:text-n400 bg-n100 dark:bg-n800 hover:bg-n200 dark:hover:bg-n700 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
        )}
        <button
          onClick={handleConfirm}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${getButtonColor()}`}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}

export default NotificationModal;
