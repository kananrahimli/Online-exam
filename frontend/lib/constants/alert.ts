/**
 * Alert component constants
 */
export const ALERT_CONFIG = {
  AUTO_CLOSE_DELAY: 5000, // 5 seconds
  DEFAULT_CONFIRM_TEXT: 'OK',
  DEFAULT_CANCEL_TEXT: 'Ləğv et',
} as const;

export const ALERT_STYLES = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: '✓',
    button: 'bg-green-600 hover:bg-green-700',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: '✗',
    button: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: '⚠',
    button: 'bg-yellow-600 hover:bg-yellow-700',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: 'ℹ',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
} as const;

