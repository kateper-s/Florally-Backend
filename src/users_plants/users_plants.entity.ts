import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class UserPlant {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    
}