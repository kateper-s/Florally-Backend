import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Plant {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    
    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    season: string;
}