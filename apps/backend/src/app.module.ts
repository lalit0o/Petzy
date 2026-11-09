import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { UserModule } from './user/user.module';
import { PetModule } from './pet/pet.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ConfigModule } from '@nestjs/config';
import { PostModule } from './post/post.module';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseAuthGuard } from './auth/guards/supabase-auth.guard';
import { CommentsModule } from './comments/comments.module';
import { LikesModule } from './likes/likes.module';
import { CommunityModule } from './community/community.module';
import { ModerationNoticesModule } from './moderation-notices/moderation-notices.module';


@Module({
  imports: [ConfigModule.forRoot({isGlobal:true}),PrismaModule,SupabaseModule,UserModule, PetModule, AuthModule, PostModule, CommentsModule, LikesModule, CommunityModule, ModerationNoticesModule],
  controllers: [AppController],
  providers: [AppService,{provide:APP_GUARD,useClass:SupabaseAuthGuard}],
})
export class AppModule {}
