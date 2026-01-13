"use client";

import { useState, useCallback } from "react";
import Alert from "@/components/Alert";

interface AlertOptions {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  confirmButtonText?: string;
  cancelButtonText?: string;
}

interface ConfirmOptions extends AlertOptions {
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function useAlert() {
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [confirmAlert, setConfirmAlert] = useState<ConfirmOptions | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlert(options);
  }, []);

  const showConfirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmAlert({
          ...options,
          onConfirm: () => {
            if (options.onConfirm) {
              options.onConfirm();
            }
            resolve(true);
          },
          onCancel: () => {
            if (options.onCancel) {
              options.onCancel();
            }
            resolve(false);
          },
        });
      });
    },
    []
  );

  const hideAlert = useCallback(() => {
    setAlert(null);
    setConfirmAlert(null);
  }, []);

  const AlertComponent = useCallback(() => {
    if (alert) {
      return (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={hideAlert}
          confirmButtonText={alert.confirmButtonText}
        />
      );
    }

    if (confirmAlert) {
      return (
        <Alert
          message={confirmAlert.message}
          type={confirmAlert.type || "warning"}
          onClose={hideAlert}
          confirmButtonText={confirmAlert.confirmButtonText || "Bəli"}
          cancelButtonText={confirmAlert.cancelButtonText}
          showCancel={true}
          onConfirm={confirmAlert.onConfirm}
        />
      );
    }

    return null;
  }, [alert, confirmAlert, hideAlert]);

  return {
    showAlert,
    showConfirm,
    hideAlert,
    AlertComponent,
  };
}
