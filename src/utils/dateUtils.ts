import { addDays, format, parseISO } from 'date-fns';

export function formatTripDate(date: string | null): string {
  if (!date) return '';
  return format(parseISO(date), 'MMM d, yyyy');
}

export function getDayLabel(startDate: string | null, dayIndex: number): string {
  if (!startDate) return `Day ${dayIndex + 1}`;
  const day = addDays(parseISO(startDate), dayIndex);
  return format(day, 'EEEE, MMM d');
}

export function formatTime(isoString: string | null): string {
  if (!isoString) return '';
  return format(parseISO(isoString), 'MMM d, h:mm a');
}
