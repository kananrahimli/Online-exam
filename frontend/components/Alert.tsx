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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-md p-4">
      <div
        className={`${style.bg} ${style.border} border-l-4 rounded-xl shadow-2xl p-6 max-w-lg w-full animate-in fade-in zoom-in duration-200`}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`${style.iconBg} ${style.iconColor} w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold shadow-sm`}>
            {style.icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className={`${style.text} text-base font-medium leading-relaxed mb-6 break-words`}>
              {message}
            </p>
            
            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              {showCancel && (
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 rounded-lg font-bold text-sm transition-all shadow-sm hover:shadow-md border border-gray-200 min-w-[100px]"
                >
                  {cancelButtonText}
                </button>
              )}
              <button
                onClick={showCancel ? handleConfirm : onClose}
                className={`px-6 py-3 ${style.button} text-white rounded-lg font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 min-w-[100px] border-2 border-transparent hover:border-white/20`}
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

