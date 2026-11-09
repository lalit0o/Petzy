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

// Resumen breve que genera el servidor para cada aviso (D-101, plan de Eventos).
export function changeSummary(
  event: { title: string; placeLabel: string; startsAt: Date; endsAt: Date; timeZone: string },
  changed: { schedule: boolean; place: boolean },
): string {
  const title = clip(event.title, 60);
  const place = clip(event.placeLabel, 80);
  const start = formatEventMoment(event.startsAt, event.timeZone);
  const end = formatEventMoment(event.endsAt, event.timeZone);
  if (changed.schedule && changed.place) return `Cambiaron el horario y el lugar de «${title}». Ahora empieza el ${start} en ${place}.`;
  if (changed.schedule) return `Cambió el horario de «${title}». Ahora empieza el ${start} y termina aproximadamente el ${end}.`;
  return `Cambió el lugar de «${title}». Ahora será en ${place}.`;
}

export function cancelSummary(event: { title: string }): string {
  return `Se canceló «${clip(event.title, 60)}».`;
}
