import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

// Límite de las columnas `Int` de PostgreSQL. Un número mayor no puede ser un
// identificador real y, sin este tope, Prisma falla con un error 500.
export const INT32_MAX = 2147483647;
const INT32_MIN = -2147483648;

// Igual que ParseIntPipe (entero en texto, si no → 400), pero además rechaza
// con 400 los números fuera del rango de la base (casos límite, 22-11-2026).
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const text = String(value);
    if (!/^-?\d+$/.test(text))
      throw new BadRequestException(
        'Validation failed (numeric string is expected)',
      );
    const parsed = Number(text);
    if (
      !Number.isSafeInteger(parsed) ||
      parsed > INT32_MAX ||
      parsed < INT32_MIN
    ) {
      throw new BadRequestException('El identificador no es válido.');
    }
    return parsed;
  }
}
