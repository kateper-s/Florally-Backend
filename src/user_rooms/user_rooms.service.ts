import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, UpdateResult } from 'typeorm';
import { UserRoom } from "./user_rooms.entity";
import { UserPlant } from "src/users_plants/users_plants.entity";
import { CreateUserRoomDto, UpdateUserRoomDto } from "src/dtos/user_rooms.dto";

@Injectable()
export class UserRoomsService {
    constructor(
        @InjectRepository(UserRoom)
        private readonly userRoomsRepository: Repository<UserRoom>,
        @InjectRepository(UserPlant)
        private readonly userPlantsRepository: Repository<UserPlant>
    ) {}

    async createRoom(userId: string, dto: CreateUserRoomDto) {
        const existingRoom = await this.userRoomsRepository.findOne({
            where: { user_id: userId, name: dto.name }
        });

        if (existingRoom) {
            throw new HttpException(
                "Комната с таким названием уже существует",
                HttpStatus.BAD_REQUEST
            );
        }

        const room = this.userRoomsRepository.create({
            name: dto.name,
            user_id: userId
        });

        const savedRoom = await this.userRoomsRepository.save(room);

        if (dto.userPlantIds && dto.userPlantIds.length > 0) {
            await this.addPlantsToRoom(userId, savedRoom.id, dto.userPlantIds);
        }

        return await this.getRoomById(userId, savedRoom.id);
    }

    async getUserRooms(userId: string) {
        const rooms = await this.userRoomsRepository.find({
            where: { user_id: userId },
            relations: ['userPlants', 'userPlants.plant']
        });

        return rooms;
    }

    async getRoomById(userId: string, roomId: string) {
        const room = await this.userRoomsRepository.findOne({
            where: { id: roomId, user_id: userId },
            relations: ['userPlants', 'userPlants.plant']
        });

        if (!room) {
            throw new HttpException("Комната не найдена", HttpStatus.NOT_FOUND);
        }

        return room;
    }

    async updateRoom(userId: string, roomId: string, dto: UpdateUserRoomDto) {
        const room = await this.getRoomById(userId, roomId);

        if (dto.name) {
            const existingRoom = await this.userRoomsRepository.findOne({
                where: { user_id: userId, name: dto.name }
            });

            if (existingRoom && existingRoom.id !== roomId) {
                throw new HttpException(
                    "Комната с таким названием уже существует",
                    HttpStatus.BAD_REQUEST
                );
            }
            room.name = dto.name;
        }

        if (dto.userPlantIds !== undefined) {
            const currentPlants: UserPlant[] = await this.userPlantsRepository.find({
                where: { room_id: roomId }
            });

            const currentPlantIds = currentPlants.map(p => p.id);
            const plantsToRemove = currentPlantIds.filter(id => !dto.userPlantIds!.includes(id));
            const plantsToAdd = dto.userPlantIds.filter(id => !currentPlantIds.includes(id));

            if (plantsToRemove.length > 0) {
                await this.userPlantsRepository.update(
                    { id: In(plantsToRemove) },
                    { room_id: null, room: null }
                );
            }

            if (plantsToAdd.length > 0) {
                await this.addPlantsToRoom(userId, roomId, plantsToAdd);
            }
        }

        await this.userRoomsRepository.save(room);

        return await this.getRoomById(userId, roomId);
    }

    async deleteRoom(userId: string, roomId: string) {
        const room = await this.getRoomById(userId, roomId);

        await this.userPlantsRepository.update(
            { room_id: roomId },
            { room_id: null, room: null }
        );

        await this.userRoomsRepository.remove(room);

        return { message: "Комната успешно удалена" };
    }

    async addPlantToRoom(userId: string, roomId: string, userPlantId: string) {
        const room = await this.getRoomById(userId, roomId);

        const userPlant = await this.userPlantsRepository.findOne({
            where: { id: userPlantId, user: { id: userId } },
            relations: ['user']
        });

        if (!userPlant) {
            throw new HttpException("Растение не найдено", HttpStatus.NOT_FOUND);
        }

        if (userPlant.room_id) {
            throw new HttpException(
                "Растение уже находится в другой комнате",
                HttpStatus.BAD_REQUEST
            );
        }

        userPlant.room_id = roomId;
        userPlant.room = room;
        await this.userPlantsRepository.save(userPlant);

        return await this.getRoomById(userId, roomId);
    }

    async removePlantFromRoom(userId: string, roomId: string, userPlantId: string) {
        await this.getRoomById(userId, roomId);

        const userPlant = await this.userPlantsRepository.findOne({
            where: { id: userPlantId, user: { id: userId }, room_id: roomId }
        });

        if (!userPlant) {
            throw new HttpException("Растение не найдено в этой комнате", HttpStatus.NOT_FOUND);
        }

        userPlant.room_id = null;
        userPlant.room = null;
        await this.userPlantsRepository.save(userPlant);

        return await this.getRoomById(userId, roomId);
    }

    private async addPlantsToRoom(userId: string, roomId: string, userPlantIds: string[]) {
        const userPlants: UserPlant[] = await this.userPlantsRepository.find({
            where: { id: In(userPlantIds), user: { id: userId } }
        });

        if (userPlants.length !== userPlantIds.length) {
            throw new HttpException("Некоторые растения не найдены", HttpStatus.NOT_FOUND);
        }

        const plantsInOtherRooms = userPlants.filter(plant => plant.room_id && plant.room_id !== roomId);
        if (plantsInOtherRooms.length > 0) {
            throw new HttpException(
                "Некоторые растения уже находятся в других комнатах",
                HttpStatus.BAD_REQUEST
            );
        }

        await this.userPlantsRepository.update(
            { id: In(userPlantIds) },
            { room_id: roomId }
        );
    }
}