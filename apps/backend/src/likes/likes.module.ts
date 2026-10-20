import { Module } from '@nestjs/common';
import { PostModule } from '../post/post.module';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';

@Module({
  imports: [PostModule],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
