import { Column, Entity, PrimaryGeneratedColumn, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { UserPlant } from "src/users_plants/users_plants.entity";
import { User } from "src/user/user.entity";

@Entity('user_rooms')
export class UserRoom {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ name: 'user_id' })
    user_id: string;

    @ManyToOne(() => User, user => user.userRooms)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @OneToMany(() => UserPlant, userPlant => userPlant.room)
    userPlants: UserPlant[];
}