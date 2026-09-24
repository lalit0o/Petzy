import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PostOwnerGuard } from 'src/auth/guards/post-owner.guard';

@Module({
  controllers: [PostController],
  providers: [PostService,PostOwnerGuard],
})
export class PostModule { }
