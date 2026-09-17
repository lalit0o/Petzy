import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SignUpDto } from './dto/signUp.dto';

import { SupabaseService } from 'src/supabase/supabase.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { create } from 'domain';
import { User } from 'src/generated/prisma/client';
import { sign } from 'crypto';
import { SignInDto } from './dto/signIn.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supa: SupabaseService, private readonly prisma: PrismaService) { }
  async singUp(createAuthDto: SignUpDto) {



    const { password, ...userData } = createAuthDto;

    //Validate against prisma if the credentials are already in use

    const isUnique = await this.prisma.user.findFirst({
      where: {
        OR: [{
          email: userData.email

        }, {
          username: userData.username

        }]
      }
    })

    //Vaalidate if the email or username are already in use by any other account registered.

    if (isUnique?.email === userData.email) {
      throw new ConflictException({ message: "El email ingresado ya está en uso" });
    }
    if (isUnique?.username === userData.username) {
      throw new ConflictException({ message: "El nombre de usuario ya está en uso" });
    }


    const supabase = this.supa.getClient();
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

    const user = await this.prisma.user.create({
      data: {
        id: uid,
        ...userData,
      },
    });

    return {
      message: 'Usuario creado exitosamente',
      statusCode: 201
    };





  }

  async signIn(signInDto: SignInDto) {
    const supabase = this.supa.getClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: signInDto.email,
      password: signInDto.password,
    });

    if (error) {
      throw new UnauthorizedException('El email o la contraseña son incorrectos');
    }

    if (!data.user || !data.session) {
      throw new UnauthorizedException('No se pudo iniciar sesión');
    }
    const user = await this.prisma.user.findUnique({where:{id:data.user.id}});

    return {
      message: 'Inicio de sesión exitoso',
      statusCode:200,
      user,
      access_token:data.session.access_token,
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  // update(id: number, updateAuthDto: UpdateAuthDto) {
  //   return `This action updates a #${id} auth`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} auth`;
  // }
}
