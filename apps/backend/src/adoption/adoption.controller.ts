import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AdoptionService } from './adoption.service';
import type { AdoptionPhotoUpload } from './adoption-photo.service';
import { PHOTOS_MAX } from './adoption-rules';
import { CreateAdoptionDto, ListAdoptionsDto, ListWithdrawnDto, ReportAdoptionDto, UpdateAdoptionDto } from './adoption.dto';

type AuthenticatedRequest = { user: { id: string } };
// Una foto de más se rechaza en el servicio con un mensaje claro; aquí solo se corta el exceso grosero.
const photos = FilesInterceptor('photos', PHOTOS_MAX + 1, { limits: { fileSize: 5 * 1024 * 1024 } });

// La identidad sale siempre del token validado; nunca del cuerpo ni de la URL.
@Controller('adoptions')
export class AdoptionController {
  constructor(private readonly adoptions: AdoptionService) {}

  @Get()
  list(@Req() r: AuthenticatedRequest, @Query() query: ListAdoptionsDto) {
    return this.adoptions.list(r.user.id, query);
  }

  @Post()
  @UseInterceptors(photos)
  create(@Req() r: AuthenticatedRequest, @Body() dto: CreateAdoptionDto, @UploadedFiles() files?: AdoptionPhotoUpload[]) {
    return this.adoptions.create(r.user.id, dto, files ?? []);
  }

  // Antes de ':id' para que «me» no se lea como un id.
  @Get('me/withdrawn')
  withdrawn(@Req() r: AuthenticatedRequest, @Query() query: ListWithdrawnDto) {
    return this.adoptions.withdrawn(r.user.id, query);
  }

  @Get(':id')
  detail(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.adoptions.detail(r.user.id, id);
  }

  @Patch(':id')
  @UseInterceptors(photos)
  update(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdoptionDto, @UploadedFiles() files?: AdoptionPhotoUpload[]) {
    return this.adoptions.update(r.user.id, id, dto, files ?? []);
  }

  @Delete(':id')
  withdraw(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.adoptions.withdraw(r.user.id, id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.adoptions.restore(r.user.id, id);
  }

  @Get(':id/photos/:photoId')
  async photo(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Param('photoId', ParseIntPipe) photoId: number, @Res() response: Response) {
    const image = await this.adoptions.photo(r.user.id, id, photoId);
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Vary', 'Authorization');
    response.send(image.bytes);
  }

  @Post(':id/contact')
  @HttpCode(200)
  contact(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.adoptions.contact(r.user.id, id);
  }

  @Post(':id/reports')
  report(@Req() r: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: ReportAdoptionDto) {
    return this.adoptions.report(r.user.id, id, dto);
  }
}
