import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Plant } from '../plants/plants.entity';
import { UserRoom } from 'src/user_rooms/user_rooms.entity';

@Entity('users_plants')
export class UserPlant {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    // много "персональных растений" у одного юзера
    @ManyToOne(() => User, user => user.userPlants)
    @JoinColumn({name: 'user_id'})
    user: User;

    // много юзеров могут иметь одно и то же растение
    @ManyToOne(() => Plant, plant => plant.userPlants)
    @JoinColumn({name: 'plant_id'})
    plant: Plant;

    @Column({type: 'varchar', length: 7, nullable: true, default: '#FFFFFF'})
    color: string;

    @ManyToOne(() => UserRoom, room => room.userPlants, { nullable: true })
    @JoinColumn({ name: 'room_id' })
    room: UserRoom | null;

    @Column({ name: 'room_id', nullable: true })
    room_id: string | null;
}
