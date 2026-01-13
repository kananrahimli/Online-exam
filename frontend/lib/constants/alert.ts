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
    bg: 'bg-white',
    border: 'border-green-500',
    text: 'text-gray-900',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    icon: '✓',
    button: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold',
    titleColor: 'text-green-700',
  },
  error: {
    bg: 'bg-white',
    border: 'border-red-500',
    text: 'text-gray-900',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    icon: '✗',
    button: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold',
    titleColor: 'text-red-700',
  },
  warning: {
    bg: 'bg-white',
    border: 'border-yellow-500',
    text: 'text-gray-900',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-700',
    icon: '⚠',
    button: 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white font-bold',
    titleColor: 'text-yellow-800',
  },
  info: {
    bg: 'bg-white',
    border: 'border-blue-500',
    text: 'text-gray-900',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    icon: 'ℹ',
    button: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold',
    titleColor: 'text-blue-700',
  },
} as const;

