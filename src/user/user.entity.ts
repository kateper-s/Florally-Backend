import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { UserPlant } from '../users_plants/users_plants.entity';

@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    username: string;

    @Column()
    password: string;

    @Column()
    is_enabled: boolean;

    @Column()
    created_at: Date;

    @Column()
    updated_at: Date;

    @OneToMany(() => UserPlant, (userPlant) => userPlant.user)
    userPlants: UserPlant[];
}