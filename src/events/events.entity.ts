import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Timestamp } from "typeorm";
import { User } from '../user/user.entity';

@Entity()
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column()
  completed: boolean;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @Column()
  data: Date;

  @ManyToOne(() => User, user => user.userPlants)
  @JoinColumn({name: 'user_id'})
  user: User;

  @Column()
  user_id: string;

  @Column()
  user_plants_id: string;

  @Column({type: 'varchar', length: 7, nullable: true, default: '#FFFFFF'})
  color: string;

  @Column({ length: 1024 })
  description: string;
}
