import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPlant } from './users_plants.entity';
import { UserPlantsService } from './users_plants.service';
import { UserPlantsController } from './users_plants.controller';
import { UserRoom } from 'src/user_rooms/user_rooms.entity';
import { CommentModule } from 'src/comments/comments.module';

@Module({
   imports: [
        TypeOrmModule.forFeature([UserPlant, UserRoom]),
        CommentModule
    ],
    controllers: [UserPlantsController],
    providers: [UserPlantsService],
    exports: [UserPlantsService],
   
})
export class UserPlantsModule {}