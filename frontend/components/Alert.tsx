"use client";

import { useEffect, useState } from "react";

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
  confirmButtonText = "OK",
  cancelButtonText = "Ləğv et",
  showCancel = false,
  onConfirm,
}: AlertProps) {
  useEffect(() => {
    // Auto close after 5 seconds for non-confirm alerts
    if (!showCancel) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showCancel, onClose]);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const typeStyles = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: "✓",
      button: "bg-green-600 hover:bg-green-700",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: "✗",
      button: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      icon: "⚠",
      button: "bg-yellow-600 hover:bg-yellow-700",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: "ℹ",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const style = typeStyles[type];

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

