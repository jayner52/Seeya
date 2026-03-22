import { format, formatDistance, parseISO, isValid } from 'date-fns';

export function formatDate(
  date: string | Date | null | undefined,
  formatStr: string = 'MMM d, yyyy'
): string {
  if (!date) return '';
  // Parse date-only strings (YYYY-MM-DD) as local midnight to avoid UTC off-by-one
  // Also handle Postgres timestamptz format ("2026-09-10 00:00:00+00")
  let d: Date;
  if (typeof date === 'string') {
    const datePart = date.split(' ')[0]; // "YYYY-MM-DD" portion
    if (date.length === 10 || (datePart.length === 10 && date.includes(' '))) {
      d = new Date(datePart + 'T00:00:00');
    } else {
      d = parseISO(date);
    }
  } else {
    d = date;
  }
  if (!isValid(d)) return '';
  return format(d, formatStr);
}

export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): string {
  if (!startDate) return '';

  const start = formatDate(startDate, 'MMM d');
  if (!endDate) return start;

  const end = formatDate(endDate, 'MMM d, yyyy');
  const startYear = formatDate(startDate, 'yyyy');
  const endYear = formatDate(endDate, 'yyyy');

  // If same year, don't repeat the year
  if (startYear === endYear) {
    return `${start} - ${end}`;
  }

  return `${formatDate(startDate, 'MMM d, yyyy')} - ${end}`;
}

export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string') {
    const datePart = date.split(' ')[0];
    if (date.length === 10 || (datePart.length === 10 && date.includes(' '))) {
      d = new Date(datePart + 'T00:00:00');
    } else {
      d = parseISO(date);
    }
  } else {
    d = date;
  }
  if (!isValid(d)) return '';
  return formatDistance(d, new Date(), { addSuffix: true });
}

export function getDaysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  if (typeof date === 'string') {
    // Normalize timestamptz ("2026-09-10 00:00:00+00") to date-only
    const dateOnly = date.split(' ')[0];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // Compare date strings directly to avoid UTC parsing issues
    if (dateOnly < todayStr) return -1;  // past
    if (dateOnly === todayStr) return 0;  // today
    // For future dates, parse both as local midnight
    const target = new Date(`${dateOnly}T00:00:00`);  // local midnight
    const today = new Date(`${todayStr}T00:00:00`);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  const d = date instanceof Date ? date : new Date(date);
  if (!isValid(d)) return null;
  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
