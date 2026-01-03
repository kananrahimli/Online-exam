/**
 * Formatting utilities
 */

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (value <= 0) return '-';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format currency (AZN)
 */
export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} AZN`;
}

/**
 * Format score (points / total)
 */
export function formatScore(score: number | null, total: number | null): string {
  if (score === null || total === null || total === 0) return '-';
  return `${score} / ${total}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned;
}

