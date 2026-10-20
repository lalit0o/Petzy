import { BadRequestException } from '@nestjs/common';

export const MAX_PRIVATE_IMAGE_BYTES = 5 * 1024 * 1024;

export function privateImageFormat(bytes: Buffer): { extension: string; contentType: string } {
  if (bytes.length >= 16 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) {
    return { extension: 'jpg', contentType: 'image/jpeg' };
  }
  if (bytes.length >= 45
    && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && bytes.readUInt32BE(8) === 13 && bytes.toString('ascii', 12, 16) === 'IHDR'
    && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0
    && bytes.toString('ascii', bytes.length - 8, bytes.length - 4) === 'IEND') {
    return { extension: 'png', contentType: 'image/png' };
  }
  if (bytes.length >= 24 && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.readUInt32LE(4) === bytes.length - 8
    && bytes.toString('ascii', 8, 12) === 'WEBP'
    && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16))) {
    return { extension: 'webp', contentType: 'image/webp' };
  }
  throw new BadRequestException('Usa una foto JPEG, PNG o WebP');
}
