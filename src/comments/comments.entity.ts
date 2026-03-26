import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn} from "typeorm";
import {UserPlant} from "src/users_plants/users_plants.entity";

@Entity()
export class Comment {
    @PrimaryGeneratedColumn("uuid")
    id:string;

    @ManyToOne(() => UserPlant, (userPlant) => userPlant.comments)
    @JoinColumn({name: 'user_plant_id'})
    userPlant: UserPlant;

    @Column()
    text: string
}