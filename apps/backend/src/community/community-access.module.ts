import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommunityAccessService } from './community-access.service';

@Module({ imports: [PrismaModule], providers: [CommunityAccessService], exports: [CommunityAccessService] })
export class CommunityAccessModule {}
