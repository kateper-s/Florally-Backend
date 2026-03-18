import { Module } from '@nestjs/common';
import { PlantsController } from './plants.controller';
import { PlantsService } from './plants.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plant } from './plants.entity';
import { UserPlant } from '../users_plants/users_plants.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Plant, UserPlant])],
    controllers: [PlantsController],
    providers: [PlantsService]
})

export class PlantsModule {}