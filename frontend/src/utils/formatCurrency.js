/**
 * Currency formatting utilities for INR (₹)
 */

/**
 * Format a number as INR currency.
 * @param {number} amount - The amount to format
 * @param {boolean} compact - Use compact notation (₹1.5K, ₹2.4L)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, compact = false) {
  if (amount == null || isNaN(amount)) return '₹0';

  const num = Number(amount);

  if (compact) {
    return formatCompact(num);
  }

  // Indian number format with commas
  return '₹' + formatIndianNumber(num);
}

/**
 * Format number with Indian comma system (e.g., 1,50,000)
 */
function formatIndianNumber(num) {
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  // Handle decimal
  const parts = absNum.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];

  // Remove trailing zeros in decimal
  const decimalStr = decPart === '00' ? '' : '.' + decPart;

  // Indian comma format
  if (intPart.length > 3) {
    const lastThree = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    return (isNegative ? '-' : '') + formatted + decimalStr;
  }

  return (isNegative ? '-' : '') + intPart + decimalStr;
}

/**
 * Compact format: ₹1.5K, ₹2.4L, ₹1.2Cr
 */
function formatCompact(num) {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 10000000) {
    return sign + '₹' + (absNum / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
  }
  if (absNum >= 100000) {
    return sign + '₹' + (absNum / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  }
  if (absNum >= 1000) {
    return sign + '₹' + (absNum / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return sign + '₹' + absNum.toFixed(0);
}

/**
 * Get a greeting based on time of day
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Format a date for display
 */
export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dDate = new Date(d);
  dDate.setHours(0, 0, 0, 0);

  if (dDate.getTime() === today.getTime()) return 'Today';
  if (dDate.getTime() === yesterday.getTime()) return 'Yesterday';
  if (dDate.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return d.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format date as full display
 */
export function formatDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}
