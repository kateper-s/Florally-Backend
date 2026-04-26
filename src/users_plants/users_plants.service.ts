import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPlant } from './users_plants.entity';
import { CreateUserPlantDto, UpdateUserPlantDto, CreateCustomUserPlantDto } from '../dtos/users_plants.dto';
import { UserRoom } from '../user_rooms/user_rooms.entity';

@Injectable()
export class UserPlantsService {
    constructor(
        @InjectRepository(UserPlant)
        private readonly userPlantRepository: Repository<UserPlant>,
        @InjectRepository(UserRoom)
        private readonly userRoomRepository: Repository<UserRoom>
    ) {}

    async addPlantToUser(dto: CreateUserPlantDto, userId: string): Promise<UserPlant> {
        const newUserPlant = this.userPlantRepository.create({
            user: { id: userId },
            plant: { id: dto.plantId },
            color: dto.color,
            is_custom: false,
        });

        if (dto.roomId) {
            const room = await this.userRoomRepository.findOne({
                where: { id: dto.roomId, user_id: userId }
            });
            if (!room) {
                throw new NotFoundException(`Комната с ID ${dto.roomId} не найдена`);
            }
            newUserPlant.room = room;
        }

        return this.userPlantRepository.save(newUserPlant);
    }

    async createCustomPlant(dto: CreateCustomUserPlantDto, userId: string): Promise<UserPlant> {
        const newUserPlant = this.userPlantRepository.create({
            user: { id: userId },
            plant: null,
            is_custom: true,
            custom_name: dto.name,
            custom_description: dto.description,
            custom_season: dto.season,
            custom_photo: dto.photo,
            color: dto.color || '#FFFFFF',
        });

        if (dto.roomId) {
            const room = await this.userRoomRepository.findOne({
                where: { id: dto.roomId, user_id: userId }
            });
            if (!room) {
                throw new NotFoundException(`Комната с ID ${dto.roomId} не найдена`);
            }
            newUserPlant.room = room;
        }

        return this.userPlantRepository.save(newUserPlant);
    }

    async findAllForUser(userId: string): Promise<UserPlant[]> {
        return this.userPlantRepository.find({
            where: { user: { id: userId } },
            relations: ['plant', 'room'],
        });
    }

    async findOneUserPlant(id: string, userId: string): Promise<UserPlant> {
        const userPlant = await this.userPlantRepository.findOne({
            where: { id: id, user: { id: userId } },
            relations: ['plant', 'room', 'comments']
        });
        if (!userPlant) {
            throw new NotFoundException(`Personal plant with ID ${id} not found`);
        }
        return userPlant;
    }

    async removeUserPlant(id: string, userId: string): Promise<void> {
        const userPlant = await this.findOneUserPlant(id, userId);
        await this.userPlantRepository.remove(userPlant);
    }

    async updateUserPlant(id: string, userId: string, dto: UpdateUserPlantDto): Promise<UserPlant> {
        const userPlant = await this.findOneUserPlant(id, userId);

        if (dto.roomId !== undefined) {
            if (dto.roomId === null) {
                userPlant.room = null;
            } else {
                const room = await this.userRoomRepository.findOne({
                    where: { id: dto.roomId, user_id: userId }
                });
                if (!room) {
                    throw new NotFoundException(`Комната с ID ${dto.roomId} не найдена`);
                }
                if (userPlant.room && userPlant.room.id !== dto.roomId) {
                    throw new BadRequestException('Растение уже находится в комнате');
                }
                userPlant.room = room;
            }
        }

        if (dto.color) {
            userPlant.color = dto.color;
        }
        if (dto.plantId) {
            userPlant.plant = { id: dto.plantId } as any;
        }
        return this.userPlantRepository.save(userPlant);
    }
}