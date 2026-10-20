import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { PetService } from './pet.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { ListOwnPetsDto } from './dto/list-own-pets.dto';
import type { PetPhotoUpload } from './pet-photo.service';

type AuthenticatedRequest = { user: { id: string } };

@Controller('pets')
export class PetController {
  constructor(private readonly pets: PetService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreatePetDto) {
    return this.pets.create(request.user.id, dto);
  }

  @Put(':id/photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  replacePhoto(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @UploadedFile() file?: PetPhotoUpload) {
    return this.pets.replacePhoto(request.user.id, id, file);
  }

  @Delete(':id/photo')
  removePhoto(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.pets.removePhoto(request.user.id, id);
  }

  @Get(':id/photo')
  async photo(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    const image = await this.pets.getPhoto(request.user.id, id);
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Vary', 'Authorization');
    response.send(image.bytes);
  }

  @Get(':id')
  detail(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.pets.detail(request.user.id, id);
  }

  @Patch(':id')
  update(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePetDto) {
    return this.pets.update(request.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.pets.remove(request.user.id, id);
  }
}

@Controller('users/me/pets')
export class OwnPetsController {
  constructor(private readonly pets: PetService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: ListOwnPetsDto) {
    return this.pets.list(request.user.id, request.user.id, query);
  }
}

@Controller('users/:id/pets')
export class PublicPetsController {
  constructor(private readonly pets: PetService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Param('id') ownerId: string, @Query() query: ListOwnPetsDto) {
    return this.pets.list(request.user.id, ownerId, query);
  }
}
