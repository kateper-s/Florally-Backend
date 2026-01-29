import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPlant } from './users_plants.entity';
import { UserPlantsService } from './users_plants.service';
import { UserPlantsController } from './users_plants.controller';

@Module({
    imports: [TypeOrmModule.forFeature([UserPlant])],
    controllers: [UserPlantsController],
    providers: [UserPlantsService]
})

export class UserPlantsModule {}