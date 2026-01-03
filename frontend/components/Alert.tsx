"use client";

import { useEffect } from "react";
import { ALERT_CONFIG, ALERT_STYLES } from "@/lib/constants/alert";

interface AlertProps {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onClose: () => void;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
}

export default function Alert({
  message,
  type = "info",
  onClose,
  confirmButtonText = ALERT_CONFIG.DEFAULT_CONFIRM_TEXT,
  cancelButtonText = ALERT_CONFIG.DEFAULT_CANCEL_TEXT,
  showCancel = false,
  onConfirm,
}: AlertProps) {
  useEffect(() => {
    // Auto close after configured delay for non-confirm alerts
    if (!showCancel) {
      const timer = setTimeout(() => {
        onClose();
      }, ALERT_CONFIG.AUTO_CLOSE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [showCancel, onClose]);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const style = ALERT_STYLES[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div
        className={`${style.bg} ${style.border} border-2 rounded-xl shadow-2xl p-6 max-w-md mx-4 animate-in fade-in zoom-in duration-200`}
      >
        <div className="flex items-start">
          <div className={`${style.text} text-3xl mr-4 flex-shrink-0`}>
            {style.icon}
          </div>
          <div className="flex-1">
            <p className={`${style.text} text-lg font-semibold mb-4`}>
              {message}
            </p>
            <div className="flex justify-end gap-3">
              {showCancel && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-all"
                >
                  {cancelButtonText}
                </button>
              )}
              <button
                onClick={showCancel ? handleConfirm : onClose}
                className={`px-4 py-2 ${style.button} text-white rounded-lg font-medium transition-all`}
              >
                {confirmButtonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

