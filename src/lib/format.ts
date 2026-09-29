export function formatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
  return `C$ ${formatted}`;
}

function toLocalDate(value: string): Date {
  // If the value is an ISO string with a timezone (Z or +xx:xx), new Date() already
  // parses it correctly. If it's a naive date-only or date-time without timezone,
  // we treat it as local time to avoid UTC offset issues.
  const s = value;
  if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s + 'Z');
  }
  return new Date(s);
}

export function formatDate(value: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(toLocalDate(value));
}

export function formatDateShort(value: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(toLocalDate(value));
}

export function localDateInputValue(d: Date = new Date()): string {
  // Returns YYYY-MM-DD in the user's local timezone, safe for <input type="date">
  const offsetMs = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}

export function localDateToISO(dateStr: string): string {
  // Converts a YYYY-MM-DD date input value to an ISO timestamp at noon local time
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr + 'T12:00:00');
  return d.toISOString();
}
