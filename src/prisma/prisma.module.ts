import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
    imports: [],
    controllers: [PrismaService],
    providers: [PrismaService],
})
export class PrismaModule { }