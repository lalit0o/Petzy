import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { bcrypt } from 'bcrypt'
import { set } from 'supertest/lib/cookies';
import { NotFoundError } from 'rxjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  
  getPetsByUserId(ownerId:string){
    return this.prisma.pet.findMany({where:{ownerId}})
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }
  async searchUsers(query: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if(updateUserDto.password){
      updateUserDto.password = await bcrypt.hash(updateUserDto.password,10);
    }

    try {
      return await this.prisma.user.update({where:{id},data:updateUserDto})
    }
    catch(error){
      throw new NotFoundException(`El usuario con el ${id} no fue encontrado`);
    }
  }

  remove(id: string) {
    return this.prisma.user.update({
      where:{id},
      data:{isActive:false
        
      },
    });
  }
}
