import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { AdoptionStatus } from '../generated/prisma/enums';

export const TITLE_MAX = 120; // D-96
export const DESCRIPTION_MAX = 3000; // D-96
export const EXPLANATION_MAX = 500; // D-97
export const PHOTOS_MIN = 1; // D-89
export const PHOTOS_MAX = 3; // D-89
export const ALREADY_REPORTED = 'ADOPTION_ALREADY_REPORTED';

// Cursor de la lista pública (AD-T06): primero «Busca hogar» y después
// «Encontró hogar», los más recientes primero dentro de cada grupo. Se escribe
// como «S-123» o «F-123»: grupo e id del último anuncio recibido.
const CURSOR = /^([SF])-(\d{1,10})$/;

export function encodeCursor(status: AdoptionStatus, id: number) {
  return `${status === AdoptionStatus.SEEKING_HOME ? 'S' : 'F'}-${id}`;
}

export function cursorWhere(cursor: string | undefined): Prisma.AdoptionListingWhereInput {
  if (!cursor) return {};
  const match = CURSOR.exec(cursor);
  if (!match) throw new BadRequestException('La página de adopciones ya no está disponible. Vuelve a cargar la lista.');
  const id = Number(match[2]);
  return match[1] === 'S'
    ? { OR: [{ status: AdoptionStatus.SEEKING_HOME, id: { lt: id } }, { status: AdoptionStatus.FOUND_HOME }] }
    : { status: AdoptionStatus.FOUND_HOME, id: { lt: id } };
}

// Orden de las fotos al editar (AD-T08): primero las que se conservan, en el
// orden pedido, y después las nuevas. Siempre deben quedar de una a tres.
export function photoPlan(currentIds: number[], keepIds: number[], added: number) {
  if (new Set(keepIds).size !== keepIds.length) throw new BadRequestException('Una foto está repetida.');
  if (keepIds.some(id => !currentIds.includes(id))) throw new BadRequestException('Una de las fotos ya no es parte de este anuncio. Vuelve a abrirlo.');
  const total = keepIds.length + added;
  if (total < PHOTOS_MIN) throw new BadRequestException('El anuncio necesita al menos una foto.');
  if (total > PHOTOS_MAX) throw new BadRequestException('El anuncio admite hasta tres fotos.');
  return { removed: currentIds.filter(id => !keepIds.includes(id)) };
}
