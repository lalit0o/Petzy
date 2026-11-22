import { INT32_MAX } from '../common/parse-id.pipe';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CLIENT_KEY, MESSAGE_MAX, REPORT_NOTE_MAX } from './chat-rules';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
// Una explicación vacía o solo con espacios cuenta como no enviada.
const optionalText = ({ value }: { value: unknown }) => typeof value === 'string' ? (value.trim() || undefined) : value;

// D-75: se abre desde el perfil de otra cuenta; el `userId` es la otra persona,
// nunca la autora, que siempre sale del token validado.
export class OpenConversationDto {
  @IsString({ message: 'Falta la persona con quien quieres conversar.' }) @MinLength(1, { message: 'Falta la persona con quien quieres conversar.' }) @MaxLength(128)
  userId!: string;
}

// D-79 y CH-08: texto con contenido y máximo 250 caracteres; la clave evita
// duplicar el mensaje si la app reintenta tras un fallo de red.
export class SendMessageDto {
  @Transform(trim) @IsString({ message: 'Escribe un mensaje.' }) @MinLength(1, { message: 'Escribe un mensaje.' }) @MaxLength(MESSAGE_MAX, { message: `El mensaje admite hasta ${MESSAGE_MAX} caracteres.` })
  body!: string;

  @IsString() @Matches(CLIENT_KEY, { message: 'La clave del mensaje no es válida.' })
  clientKey!: string;
}

export class MarkReadDto {
  @Type(() => Number) @IsInt({ message: 'Falta el mensaje leído.' }) @Min(1, { message: 'Falta el mensaje leído.' })
  messageId!: number;
}

// CH-T09 (D-77, D-146, D-147): mensajes elegidos, explicación opcional de
// hasta 500 caracteres y clave para que un reintento no duplique el reporte.
export class ReportConversationDto {
  @IsArray({ message: 'Elige al menos un mensaje para reportar.' }) @ArrayMinSize(1, { message: 'Elige al menos un mensaje para reportar.' }) @ArrayUnique({ message: 'Un mensaje está repetido en el reporte.' })
  @Type(() => Number) @IsInt({ each: true, message: 'Un mensaje elegido no es válido.' }) @Min(1, { each: true, message: 'Un mensaje elegido no es válido.' })
  messageIds!: number[];

  @IsOptional() @Transform(optionalText) @IsString() @MaxLength(REPORT_NOTE_MAX, { message: `La explicación admite hasta ${REPORT_NOTE_MAX} caracteres.` })
  note?: string;

  @IsString() @Matches(CLIENT_KEY, { message: 'La clave del reporte no es válida.' })
  clientKey!: string;
}

export class ListPageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(INT32_MAX)
  cursor?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30)
  limit?: number;
}
