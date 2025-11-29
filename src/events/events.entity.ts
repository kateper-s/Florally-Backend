import { Entity, PrimaryGeneratedColumn, Column, Timestamp } from "typeorm";

@Entity()
export class Event {
    @PrimaryGeneratedColumn('uuid')
    id:string;
    
    @Column({length:255})
    name:string;

    @Column()
    completed:boolean;

    @Column()
    created_at:Date;

    @Column()
    updated_at:Date;

    @Column()
    data:Date;

    @Column()
    user_id:string;

    @Column()
    user_plants_id:string;

    @Column({length:255})
    color:string; 

    @Column({length:1024})
    description:string;
}