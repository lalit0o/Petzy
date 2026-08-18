import { Injectable } from '@nestjs/common';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PetService {
  constructor(private prisma:PrismaService){

  }
  create(createPetDto: CreatePetDto) {
    return this.prisma.pet.create({data:createPetDto});
  }

  findAll() {
    return `This action returns all pet`;
  }
  find

  findOne(id: number) {
    return `This action returns a #${id} pet`;
  }

  update(id: number, updatePetDto: UpdatePetDto) {
    return this.prisma.pet.update({where:{id},data:{updatePetDto}})
  }

  remove(id: number) {
    return this.prisma.pet.update({where:{id},data:{isActive:false}});
  }
}
