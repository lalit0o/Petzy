import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { UserModule } from './user/user.module';
import { PetModule } from './pet/pet.module';


@Module({
  imports: [PrismaService, UserModule, PetModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
