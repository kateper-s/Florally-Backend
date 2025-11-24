import { Entity, PrimaryGeneratedColumn, Column, Timestamp } from "typeorm";

@Entity()
export class Event {
    @PrimaryGeneratedColumn()
    id:number;
    
    @Column({length:255})
    name:string;

    @Column()
    completed:boolean;

    @Column()
    created_at:Timestamp;

    @Column()
    updated_at:Timestamp;

    @Column()
    data:Timestamp;

    @Column()
    user_id:number;

    @Column()
    user_plants_id:number;

    @Column({length:255})
    color:string; 

    @Column({length:1024})
    description:string;
}