import { Module } from '@nestjs/common';
import { PlantsController } from './plants.controller';
import { PlantsService } from './plants.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plant } from './plants.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Plant])],
    controllers: [PlantsController],
    providers: [PlantsService]
})

export class PlantsModule {}