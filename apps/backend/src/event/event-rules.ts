// Reglas puras de Eventos (ficha 09-EVENTOS, D-99–D-119). Sin acceso a datos
// para poder probarlas de forma aislada.

export type EventPhase = 'upcoming' | 'ongoing' | 'past';
export const EVENT_SECTIONS: EventPhase[] = ['upcoming', 'ongoing', 'past'];

// «Próximos», «En curso» y «Eventos anteriores» (D-105, D-112). Un cancelado
// pasa de inmediato a anteriores aunque falte para su horario (D-118).
export function eventPhase(event: { status: string; startsAt: Date; endsAt: Date }, now: Date): EventPhase {
  if (event.status === 'CANCELLED') return 'past';
  if (now < event.startsAt) return 'upcoming';
  if (now < event.endsAt) return 'ongoing';
  return 'past';
}

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

// Coordenadas con la precisión de la columna Decimal(9, 6).
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function formatEventMoment(date: Date, timeZone: string): string {
  const zone = isValidTimeZone(timeZone) ? timeZone : 'America/Mexico_City';
  const day = new Intl.DateTimeFormat('es-MX', { timeZone: zone, day: 'numeric', month: 'long' }).format(date);
  const time = new Intl.DateTimeFormat('es-MX', { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(date);
  return `${day}, ${time}`;
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// Fecha corta para los avisos: «20 nov, 3:00 p.m.».
export function formatShortMoment(date: Date, timeZone: string): string {
  const zone = isValidTimeZone(timeZone) ? timeZone : 'America/Mexico_City';
  const day = new Intl.DateTimeFormat('es-MX', { timeZone: zone, day: 'numeric', month: 'short' }).format(date);
  const time = new Intl.DateTimeFormat('es-MX', { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(date);
  return `${day}, ${time}`;
}

// Resumen del aviso (D-101): solo lo nuevo, en pocas palabras. El nombre del
// evento viaja aparte (`event.title`) y la app lo muestra arriba en negritas.
// Se acortó el 12-11-2026 porque el texto completo resultaba abrumador; el fin
// aproximado y el resto del detalle se ven al abrir el evento.
export function changeSummary(
  event: { placeLabel: string; startsAt: Date; timeZone: string },
  changed: { schedule: boolean; place: boolean },
): string {
  const place = clip(event.placeLabel, 80);
  const start = formatShortMoment(event.startsAt, event.timeZone);
  if (changed.schedule && changed.place) return `Nueva hora y lugar: ${start} · ${place}`;
  if (changed.schedule) return `Nueva hora: ${start}`;
  return `Nuevo lugar: ${place}`;
}

export function cancelSummary(): string {
  return 'Cancelado';
}
