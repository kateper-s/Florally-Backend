import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn} from "typeorm";
import {UserPlant} from "src/users_plants/users_plants.entity";
import { User } from "src/user/user.entity";

@Entity()
export class Comment {
    @PrimaryGeneratedColumn("uuid")
    id:string;

    @ManyToOne(() => UserPlant, (userPlant) => userPlant.id)
    @JoinColumn({name: 'user_plant_id'})
    userPlant: UserPlant;

    @Column()
    text: string
}