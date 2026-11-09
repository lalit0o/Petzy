import { cancelSummary, changeSummary, eventPhase, formatEventMoment, isValidTimeZone, roundCoordinate } from './event-rules';

describe('reglas de Eventos', () => {
  const startsAt = new Date('2026-11-20T23:00:00Z');
  const endsAt = new Date('2026-11-21T02:00:00Z'); // cruza medianoche UTC
  const event = { status: 'PUBLISHED', startsAt, endsAt };

  it('clasifica por inicio y fin aproximado, con frontera exacta (D-105, D-112)', () => {
    expect(eventPhase(event, new Date('2026-11-20T22:59:59.999Z'))).toBe('upcoming');
    expect(eventPhase(event, startsAt)).toBe('ongoing');
    expect(eventPhase(event, new Date('2026-11-21T00:30:00Z'))).toBe('ongoing');
    expect(eventPhase(event, endsAt)).toBe('past');
  });

  it('manda un cancelado a anteriores aunque aún no empiece (D-118)', () => {
    expect(eventPhase({ ...event, status: 'CANCELLED' }, new Date('2026-11-01T00:00:00Z'))).toBe('past');
  });

  it('acepta solo zonas horarias reales', () => {
    expect(isValidTimeZone('America/Tijuana')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Marte/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });

  it('redondea coordenadas a seis decimales', () => {
    expect(roundCoordinate(32.5149471234)).toBe(32.514947);
    expect(roundCoordinate(-117.0382459)).toBe(-117.038246);
  });

  it('formatea fecha y hora en la zona del evento', () => {
    expect(formatEventMoment(startsAt, 'America/Tijuana')).toMatch(/20 de noviembre/);
    expect(formatEventMoment(startsAt, 'Zona/Inventada')).toMatch(/noviembre/);
  });

  it('resume el cambio según lo que cambió', () => {
    const base = { title: 'Paseo en la playa', placeLabel: 'Playas de Tijuana', startsAt, endsAt, timeZone: 'America/Tijuana' };
    expect(changeSummary(base, { schedule: true, place: false })).toMatch(/^Cambió el horario de «Paseo en la playa»/);
    expect(changeSummary(base, { schedule: false, place: true })).toMatch(/^Cambió el lugar de «Paseo en la playa». Ahora será en Playas de Tijuana\.$/);
    expect(changeSummary(base, { schedule: true, place: true })).toMatch(/^Cambiaron el horario y el lugar/);
    expect(cancelSummary(base)).toBe('Se canceló «Paseo en la playa».');
    expect(changeSummary({ ...base, title: 'x'.repeat(120), placeLabel: 'y'.repeat(200) }, { schedule: true, place: true }).length).toBeLessThanOrEqual(300);
  });
});
