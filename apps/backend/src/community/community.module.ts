import { CommunityDeletionModule } from './community-deletion.module';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommunityAccessModule } from './community-access.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({ imports: [PrismaModule, CommunityAccessModule, CommunityDeletionModule], controllers: [CommunityController], providers: [CommunityService] })
export class CommunityModule {}
