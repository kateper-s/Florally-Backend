import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

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
}
