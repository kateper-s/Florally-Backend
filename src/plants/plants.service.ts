import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Plant } from './plants.entity';
import { CreatePlantDto } from '../dtos/plants.dto';

@Injectable()
export class PlantsService {
    constructor(
        @InjectRepository(Plant)
        private readonly plantsRepository: Repository<Plant>
    ) {}

    async getAllPlants(): Promise<Plant[]> {
        return await this.plantsRepository.find({
            order: { name: 'ASC' }
        });
    }

    async getPlantById(id: string): Promise<Plant> {
        const plant = await this.plantsRepository.findOne({
            where: { id }
        });

        if (!plant) {
            throw new NotFoundException(`Plant with ID ${id} not found`);
        }

        return plant;
    }

    async getPlantsBySeason(season: string): Promise<Plant[]> {
        return await this.plantsRepository.find({
            where: { season: Like(`%${season}%`) },
            order: { name: 'ASC' }
        });
    }

    async searchPlants(name: string): Promise<Plant[]> {
        return await this.plantsRepository
            .createQueryBuilder('plant')
            .where('LOWER(plant.name) LIKE LOWER(:name)', { name: `%${name}%` })
            .orderBy('plant.name', 'ASC')
            .getMany();
    }
}