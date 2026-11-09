import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { EventAttendanceStatus } from '../generated/prisma/enums';
import { EVENT_SECTIONS, type EventPhase } from './event-rules';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

// D-114: título, descripción y lugar con texto y máximos de 120, 3 000 y 200.
// D-99: el punto llega desde el mapa; la persona no escribe coordenadas.
export class CreateEventDto {
  @Transform(trim) @IsString() @MinLength(1, { message: 'Escribe un título.' }) @MaxLength(120, { message: 'El título admite hasta 120 caracteres.' })
  title!: string;

  @Transform(trim) @IsString() @MinLength(1, { message: 'Escribe una descripción.' }) @MaxLength(3000, { message: 'La descripción admite hasta 3 000 caracteres.' })
  description!: string;

  @Transform(trim) @IsString() @MinLength(1, { message: 'Escribe el nombre o la dirección del lugar.' }) @MaxLength(200, { message: 'El lugar admite hasta 200 caracteres.' })
  placeLabel!: string;

  @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Elige el punto en el mapa.' }) @Min(-90, { message: 'El punto del mapa no es válido.' }) @Max(90, { message: 'El punto del mapa no es válido.' })
  latitude!: number;

  @Type(() => Number) @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Elige el punto en el mapa.' }) @Min(-180, { message: 'El punto del mapa no es válido.' }) @Max(180, { message: 'El punto del mapa no es válido.' })
  longitude!: number;

  @IsISO8601({ strict: true }, { message: 'Elige la fecha y hora de inicio.' })
  startsAt!: string;

  @IsISO8601({ strict: true }, { message: 'Elige la fecha y la hora aproximada de fin.' })
  endsAt!: string;

  @IsString({ message: 'Falta la zona horaria.' }) @MinLength(1, { message: 'Falta la zona horaria.' }) @MaxLength(64)
  timeZone!: string;
}

// Clave que la app conserva al reintentar un cambio de horario, lugar o
// cancelación; evita avisos repetidos (plan de Eventos, EV-T11).
const REQUEST_KEY = /^[A-Za-z0-9_-]{8,64}$/;

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @IsOptional() @IsString() @Matches(REQUEST_KEY, { message: 'La clave de la solicitud no es válida.' })
  requestKey?: string;
}

export class CancelEventDto {
  @IsOptional() @IsString() @Matches(REQUEST_KEY, { message: 'La clave de la solicitud no es válida.' })
  requestKey?: string;
}

export class ListEventsDto {
  @IsIn(EVENT_SECTIONS, { message: 'Elige «Próximos», «En curso» o «Eventos anteriores».' })
  section!: EventPhase;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  cursor?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30)
  limit?: number;
}

export class AttendanceDto {
  @IsEnum(EventAttendanceStatus, { message: 'Elige «Iré» o «No iré».' })
  response!: EventAttendanceStatus;
}

export class ListEventNoticesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  cursor?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30)
  limit?: number;
}
