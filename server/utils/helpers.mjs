/**
 * Shared utility functions for all modules
 */

// Convert month name to quarter
export function monthToQuarter(month) {
  const q1 = ['Jan', 'Feb', 'Mar'];
  const q2 = ['Apr', 'May', 'Jun'];
  const q3 = ['Jul', 'Aug', 'Sep'];
  const q4 = ['Oct', 'Nov', 'Dec'];

  if (q1.includes(month)) return 'Q1';
  if (q2.includes(month)) return 'Q2';
  if (q3.includes(month)) return 'Q3';
  if (q4.includes(month)) return 'Q4';
  return null;
}

// Month order for sorting
export const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Sort months by order
export function sortMonths(months) {
  return months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
}

// Quarter order for sorting
export const quarterOrder = ['Q1', 'Q2', 'Q3', 'Q4'];

// Sort quarters by order
export function sortQuarters(quarters) {
  return quarters.sort((a, b) => quarterOrder.indexOf(a) - quarterOrder.indexOf(b));
}

// Safe numeric conversion from PostgreSQL (handles '-' as null)
export function safeNumeric(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '-' || value === '') {
    return defaultValue;
  }
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

// Build COALESCE expression for numeric fields
export function coalesceNumeric(field, alias) {
  return `COALESCE(NULLIF(${field}, '-'), '0')::numeric as ${alias || field}`;
}

// Format currency for Thai Baht
export function formatCurrency(amount) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Calculate percentage safely
export function calcPercentage(actual, target, decimals = 2) {
  if (!target || target === 0) return 0;
  return Number(((actual / target) * 100).toFixed(decimals));
}

// Async error handler wrapper for Express routes
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
