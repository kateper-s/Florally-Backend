import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../user/user.entity';
import { Plant } from '../plants/plants.entity';
import { UserRoom } from 'src/user_rooms/user_rooms.entity';
import { Comment } from '../comments/comments.entity';

@Entity('users_plants')
export class UserPlant {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => User, user => user.userPlants)
    @JoinColumn({name: 'user_id'})
    user: User;

    @ManyToOne(() => Plant, plant => plant.userPlants, { nullable: true })
    @JoinColumn({name: 'plant_id'})
    plant: Plant | null;

    @OneToMany(() => Comment, (comment) => comment.userPlant)
    comments: Comment[];

    @Column({type: 'varchar', length: 7, nullable: true, default: '#FFFFFF'})
    color: string;

    @ManyToOne(() => UserRoom, room => room.userPlants, { nullable: true })
    @JoinColumn({ name: 'room_id' })
    room: UserRoom | null;

    @Column({ name: 'room_id', nullable: true })
    room_id: string | null;

    @Column({ name: 'is_custom', default: false })
    is_custom: boolean;

    @Column({ name: 'custom_name', nullable: true })
    custom_name: string;

    @Column({ name: 'custom_description', nullable: true, length: 1024 })
    custom_description: string;

    @Column({ name: 'custom_season', nullable: true })
    custom_season: string;

    @Column({ name: 'custom_photo', nullable: true, type: 'text' })
    custom_photo: string;
}