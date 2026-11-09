// Fecha relativa para publicaciones: "hace N minutos/horas/días" y, pasada
// una semana, una fecha normal — mismo criterio que usan Instagram/Twitter.
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (seconds < 60) return 'justo ahora';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric' });
}
