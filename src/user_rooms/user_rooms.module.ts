import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRoom } from './user_rooms.entity';
import { UserRoomsService } from './user_rooms.service';
import { UserRoomController } from './user_rooms.controller';
import { UserPlant } from 'src/users_plants/users_plants.entity';

@Module({
    imports: [TypeOrmModule.forFeature([UserRoom, UserPlant])],
    controllers: [UserRoomController],
    providers: [UserRoomsService],
    exports: [UserRoomsService]
})
export class UserRoomsModule {}