import type { CommunityEvent, EventPhase } from '@/lib/events-api';

// Fechas de un evento en su propia zona horaria (D-104, D-107).
export function deviceTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City'; } catch { return 'America/Mexico_City'; }
}

function format(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  try { return date.toLocaleString('es-MX', { ...options, timeZone }); } catch { return date.toLocaleString('es-MX', options); }
}

export function eventDay(iso: string, timeZone: string) {
  return format(new Date(iso), timeZone, { weekday: 'long', day: 'numeric', month: 'long' });
}
export function eventTime(iso: string, timeZone: string) {
  return format(new Date(iso), timeZone, { hour: 'numeric', minute: '2-digit' });
}
// «sábado 15 de noviembre, 10:00 a. m.»
export function eventMoment(iso: string, timeZone: string) {
  return `${eventDay(iso, timeZone)}, ${eventTime(iso, timeZone)}`;
}
// Para la tarjeta: «15 nov · 10:00 a. m.»
export function eventShortMoment(iso: string, timeZone: string) {
  return `${format(new Date(iso), timeZone, { day: 'numeric', month: 'short' })} · ${eventTime(iso, timeZone)}`;
}
export function sameDay(a: string, b: string, timeZone: string) {
  return format(new Date(a), timeZone, { year: 'numeric', month: 'numeric', day: 'numeric' }) === format(new Date(b), timeZone, { year: 'numeric', month: 'numeric', day: 'numeric' });
}

export const sectionLabel: Record<EventPhase, string> = { ongoing: 'En curso', upcoming: 'Próximos', past: 'Eventos anteriores' };

// Estado con palabra, no solo con color (DI-EV-02).
export function stateLabel(event: Pick<CommunityEvent, 'status' | 'phase'>) {
  if (event.status === 'CANCELLED') return 'Cancelado';
  return event.phase === 'upcoming' ? 'Próximo' : event.phase === 'ongoing' ? 'En curso' : 'Anterior';
}

export function goingLabel(count: number) {
  return count === 1 ? '1 persona confirmó «Iré»' : `${count} personas confirmaron «Iré»`;
}
