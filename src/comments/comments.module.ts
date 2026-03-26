import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { Comment } from './comments.entity';
import { UserPlant } from '../users_plants/users_plants.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, UserPlant])],
  providers: [CommentsService],
  controllers: [CommentsController],
  exports: [CommentsService],
})
export class CommentModule {}