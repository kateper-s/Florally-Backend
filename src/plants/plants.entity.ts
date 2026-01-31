import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { UserPlant } from "src/users_plants/users_plants.entity";

@Entity()
export class Plant {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    
    @Column({length:255})
    name: string;

    @Column({length:1024})
    description: string;

    @Column()
    season: string;

    @Column({type: 'text', nullable: true})
    photo: string;

    @OneToMany(() => UserPlant, (userPlant) => userPlant.plant)
    userPlants: UserPlant[];
}
