import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ModerationNoticesController } from './moderation-notices.controller';
import { ModerationNoticesService } from './moderation-notices.service';

@Module({ imports: [PrismaModule], controllers: [ModerationNoticesController], providers: [ModerationNoticesService] })
export class ModerationNoticesModule {}
