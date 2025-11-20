import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plant } from './plants.entity';
import { CreatePlantDto } from '../dtos/plants.dto';

@Injectable()
export class PlantsService {
    constructor(
        @InjectRepository(Plant)
        private readonly plantsRepository: Repository<Plant>
    ) {}
}