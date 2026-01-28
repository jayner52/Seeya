import { format, formatDistance, parseISO, isValid } from 'date-fns';

export function formatDate(
  date: string | Date | null | undefined,
  formatStr: string = 'MMM d, yyyy'
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
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
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '';
  return formatDistance(d, new Date(), { addSuffix: true });
}

export function getDaysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return null;

  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
