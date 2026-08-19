import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { create } from 'domain';

@Injectable()
export class AuthService {
  constructor(private readonly supa: SupabaseService,private readonly prisma:PrismaService) { }
  async singUp(createAuthDto: CreateAuthDto) {
    const supabase = this.supa.getClient();
    const {password,...userData} = createAuthDto;
    const { data, error } = await supabase.auth.signUp({
      email: createAuthDto.email,
      password: password
    });
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data.user) {
      throw new BadRequestException('No se pudo crear el usuario');
    }


    const uid = data.user.id;
    console.log(uid);

    return (this.prisma.user.create({data:{id:uid,...userData}

    }),{message:"Usuario creado exitosamente"});





  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
