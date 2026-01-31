import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPlant } from './users_plants.entity';
import { CreateUserPlantDto } from '../dtos/users_plants.dto';

@Injectable()
export class UserPlantsService {
    constructor(
        @InjectRepository(UserPlant)
        private readonly userPlantRepository: Repository<UserPlant>
    ) {}

    async addPlantToUser(dto: CreateUserPlantDto, userId: string): Promise<UserPlant> {
        const newUserPlant = this.userPlantRepository.create({
        user: {id: userId},
        plant: {id: dto.plantId},
        color: dto.color
        });
        return this.userPlantRepository.save(newUserPlant);
        }

    async findAllForUser(userId: string): Promise<UserPlant[]> {
        return this.userPlantRepository.find({
        where: { user: {id: userId} },
        relations: ['plant'],
        });
        }

    async findOneUserPlant(id: string, userId: string): Promise<UserPlant> {
        const userPlant = await this.userPlantRepository.findOne({
            where: { id: id, user: {id: userId} },
            relations: ['plant']
        });

        if (!userPlant) {
            throw new NotFoundException(`Personal plant with ID ${id} not found`);
        }
        return userPlant;
        }

    async removeUserPlant(id: string, userId: string): Promise<void> {
        const userPlant = await this.userPlantRepository.findOne({ 
            where: { id: id, user: {id: userId} }
        });

        if (!userPlant) {
            throw new NotFoundException(`Personal plant with ID ${id} not found`);
        }
        await this.userPlantRepository.remove(userPlant);
        }
}
