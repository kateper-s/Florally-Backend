import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPlant } from './users_plants.entity';
import { UserPlantsService } from './users_plants.service';
import { UserPlantsController } from './users_plants.controller';
import { User } from 'src/user/user.entity';
import { Plant } from 'src/plants/plants.entity';

@Module({
    imports: [TypeOrmModule.forFeature([UserPlant, User, Plant])],
    controllers: [UserPlantsController],
    providers: [UserPlantsService]
})

export class UserPlantsModule {}